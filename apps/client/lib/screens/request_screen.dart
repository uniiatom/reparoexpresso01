import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:reparo_shared/reparo_shared.dart';

const _urgencyOptions = [
  ('agora', '🔥 Agora'),
  ('hoje', '⏰ Hoje'),
  ('esta_semana', '📅 Esta semana'),
];

const _scheduleTimes = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

/// Porta de `legacy/src/pages/SolicitarServico.jsx`: urgência ou
/// agendamento (próximos 7 dias, 8h-17h), sub-serviço específico (catálogo
/// novo — ver /MIGRATION.md), endereço (texto manual — sem mapa
/// interativo), fotos do problema. Cria a OS e segue pro pagamento.
///
/// Prévia de prestadores disponíveis via GPS do dispositivo (`geolocator`)
/// + RPC `find_nearby_providers` (Haversine no banco, sem mapa/API paga).
class RequestScreen extends StatefulWidget {
  const RequestScreen({super.key, required this.profession});

  final Profession profession;

  @override
  State<RequestScreen> createState() => _RequestScreenState();
}

class _RequestScreenState extends State<RequestScreen> {
  final _notesController = TextEditingController();
  final _addressController = TextEditingController();
  final _neighborhoodController = TextEditingController();
  final _cityController = TextEditingController();
  final _stateController = TextEditingController();
  final _deliveryAddressController = TextEditingController();
  final _deliveryNeighborhoodController = TextEditingController();
  final _deliveryCityController = TextEditingController();

  late final Future<List<SubService>> _subServicesFuture =
      CatalogRepository(ReparoSupabase.client).listSubServices(widget.profession.id);

  late final Future<SurchargeCheckResult> _surchargeFuture =
      SurchargeRuleRepository(ReparoSupabase.client).checkApplicable(professionId: widget.profession.id);

  String _urgency = 'agora';
  String _modality = 'imediato';
  DateTime? _scheduledDate;
  String? _scheduledTime;
  SubService? _selectedSubService;
  final List<XFile> _photos = [];
  bool _submitting = false;
  String? _error;

  double? _latitude;
  double? _longitude;
  bool _locating = false;
  String? _locationError;
  Future<List<NearbyProvider>>? _nearbyFuture;

  final _formRepository = ServiceRequestFormRepository(ReparoSupabase.client);
  Future<List<ServiceRequestFormField>>? _formFieldsFuture;
  final Map<String, TextEditingController> _formControllers = {};

  bool get _isReboque => widget.profession.slug == 'guincho';

  void _loadFormFields(String? subServiceId) {
    for (final c in _formControllers.values) {
      c.dispose();
    }
    _formControllers.clear();
    setState(() {
      _formFieldsFuture = subServiceId == null ? null : _formRepository.listFields(subServiceId);
    });
  }

  Future<void> _fillLocationField(String fieldId) async {
    await _useMyLocation();
    final lat = _latitude;
    final lng = _longitude;
    if (lat != null && lng != null && mounted) {
      setState(() {
        _formControllers.putIfAbsent(fieldId, () => TextEditingController()).text = '$lat, $lng';
      });
    }
  }

  Future<void> _useMyLocation() async {
    setState(() {
      _locating = true;
      _locationError = null;
    });
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        throw StateError('Ative o GPS do aparelho para usar essa opção.');
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
        throw StateError('Permissão de localização negada.');
      }
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.medium),
      );
      if (!mounted) return;
      setState(() {
        _latitude = position.latitude;
        _longitude = position.longitude;
      });
      _refreshNearby();
    } catch (e) {
      if (mounted) setState(() => _locationError = e.toString().replaceFirst('StateError: ', ''));
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  void _refreshNearby() {
    final lat = _latitude;
    final lng = _longitude;
    if (lat == null || lng == null) return;
    setState(() {
      _nearbyFuture = CatalogRepository(ReparoSupabase.client).findNearbyProviders(
        latitude: lat,
        longitude: lng,
        professionId: widget.profession.id,
        subServiceId: _selectedSubService?.id,
      );
    });
  }

  @override
  void dispose() {
    _notesController.dispose();
    _addressController.dispose();
    _neighborhoodController.dispose();
    _cityController.dispose();
    _stateController.dispose();
    _deliveryAddressController.dispose();
    _deliveryNeighborhoodController.dispose();
    _deliveryCityController.dispose();
    for (final c in _formControllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _pickPhoto() async {
    final file = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 80);
    if (file != null) setState(() => _photos.add(file));
  }

  Future<void> _confirm() async {
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final storage = StorageRepository(ReparoSupabase.client);
      final photoUrls = <String>[];
      for (final photo in _photos) {
        final bytes = await photo.readAsBytes();
        final url = await storage.uploadBytes(Uint8List.fromList(bytes), fileName: photo.name);
        photoUrls.add(url);
      }

      final request = await ServiceRequestRepository(ReparoSupabase.client).createDraft(
        professionId: widget.profession.id,
        subServiceId: _selectedSubService?.id,
        notes: _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
        address: _addressController.text.trim().isEmpty ? null : _addressController.text.trim(),
        neighborhood: _neighborhoodController.text.trim().isEmpty ? null : _neighborhoodController.text.trim(),
        city: _cityController.text.trim().isEmpty ? null : _cityController.text.trim(),
        state: _stateController.text.trim().isEmpty ? null : _stateController.text.trim(),
        latitude: _latitude,
        longitude: _longitude,
        urgency: _urgency,
        modality: _modality,
        scheduledDate: _scheduledDate,
        scheduledTime: _scheduledTime,
        problemPhotos: photoUrls,
        deliveryAddress: _isReboque && _deliveryAddressController.text.trim().isNotEmpty
            ? _deliveryAddressController.text.trim()
            : null,
        deliveryNeighborhood: _isReboque && _deliveryNeighborhoodController.text.trim().isNotEmpty
            ? _deliveryNeighborhoodController.text.trim()
            : null,
        deliveryCity:
            _isReboque && _deliveryCityController.text.trim().isNotEmpty ? _deliveryCityController.text.trim() : null,
      );
      if (_formControllers.isNotEmpty) {
        await _formRepository.submitAnswers(
          request.id,
          _formControllers.map((fieldId, controller) => MapEntry(fieldId, controller.text)),
        );
      }
      if (!mounted) return;
      context.pushReplacement('/payment', extra: request);
    } catch (e) {
      setState(() => _error = 'Não foi possível criar a solicitação. Tente novamente.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final profession = widget.profession;
    final next7Days = List.generate(7, (i) => DateTime.now().add(Duration(days: i + 1)));

    return Scaffold(
      appBar: AppBar(title: Text(profession.name)),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          if (profession.description != null) Text(profession.description!),
          FutureBuilder<SurchargeCheckResult>(
            future: _surchargeFuture,
            builder: (context, snapshot) {
              final result = snapshot.data;
              if (result == null || result.applicable.isEmpty) return const SizedBox.shrink();
              return Padding(
                padding: const EdgeInsets.only(top: 16),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.orange.withValues(alpha: 0.1),
                    border: Border.all(color: Colors.orange.withValues(alpha: 0.4)),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.warning_amber_rounded, color: Colors.orange, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Sobretaxa aplicada: +${result.totalSurchargePercent}%',
                              style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.orange),
                            ),
                            for (final rule in result.applicable)
                              Text(
                                '• ${rule.name}: +${rule.surchargePercent}%'
                                '${rule.description != null ? ' — ${rule.description}' : ''}',
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                            Text(
                              'O valor final do serviço será acrescido dessas taxas'
                              '${result.referenceTime != null ? ' por ser solicitado às ${result.referenceTime}' : ''}.',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 24),
          Text('Qual o serviço específico?', style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 8),
          FutureBuilder<List<SubService>>(
            future: _subServicesFuture,
            builder: (context, snapshot) {
              final subServices = snapshot.data ?? const [];
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: LinearProgressIndicator(),
                );
              }
              if (subServices.isEmpty) {
                return const Text('Descreva o que você precisa no campo abaixo.');
              }
              return Wrap(
                spacing: 8,
                runSpacing: 8,
                children: subServices.map((sub) {
                  return ChoiceChip(
                    label: Text(sub.name),
                    selected: _selectedSubService?.id == sub.id,
                    onSelected: (selected) {
                      setState(() => _selectedSubService = selected ? sub : null);
                      _refreshNearby();
                      _loadFormFields(selected ? sub.id : null);
                    },
                  );
                }).toList(),
              );
            },
          ),
          if (_formFieldsFuture != null) ...[
            const SizedBox(height: 16),
            FutureBuilder<List<ServiceRequestFormField>>(
              future: _formFieldsFuture,
              builder: (context, snapshot) {
                final fields = snapshot.data ?? const [];
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: 8),
                    child: LinearProgressIndicator(),
                  );
                }
                if (fields.isEmpty) return const SizedBox.shrink();
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    for (final field in fields) ...[
                      const SizedBox(height: 12),
                      _DynamicFormField(
                        field: field,
                        controller: _formControllers.putIfAbsent(field.id, () => TextEditingController()),
                        onUseLocation: field.fieldType == 'location' ? () => _fillLocationField(field.id) : null,
                        locating: _locating,
                      ),
                    ],
                  ],
                );
              },
            ),
          ],
          const SizedBox(height: 24),
          Text('Quando?', style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 8),
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'imediato', label: Text('Agora')),
              ButtonSegment(value: 'agendado', label: Text('Agendar')),
            ],
            selected: {_modality},
            onSelectionChanged: (v) => setState(() => _modality = v.first),
          ),
          if (_modality == 'imediato') ...[
            const SizedBox(height: 12),
            Text('Urgência', style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: _urgencyOptions.map((option) {
                final (value, label) = option;
                return ChoiceChip(
                  label: Text(label),
                  selected: _urgency == value,
                  onSelected: (_) => setState(() => _urgency = value),
                );
              }).toList(),
            ),
          ] else ...[
            const SizedBox(height: 12),
            SizedBox(
              height: 64,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: next7Days.length,
                separatorBuilder: (_, _) => const SizedBox(width: 4),
                itemBuilder: (context, index) {
                  final date = next7Days[index];
                  final selected = _scheduledDate?.day == date.day && _scheduledDate?.month == date.month;
                  return ChoiceChip(
                    label: Text('${date.day}/${date.month}'),
                    selected: selected,
                    onSelected: (_) => setState(() => _scheduledDate = date),
                  );
                },
              ),
            ),
            if (_scheduledDate != null) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: _scheduleTimes.map((time) {
                  return ChoiceChip(
                    label: Text(time),
                    selected: _scheduledTime == time,
                    onSelected: (_) => setState(() => _scheduledTime = time),
                  );
                }).toList(),
              ),
            ],
          ],
          const SizedBox(height: 24),
          Text('Localização', style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 8),
          TextField(controller: _addressController, decoration: const InputDecoration(labelText: 'Endereço')),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _neighborhoodController,
                  decoration: const InputDecoration(labelText: 'Bairro'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextField(controller: _cityController, decoration: const InputDecoration(labelText: 'Cidade')),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _stateController,
            decoration: const InputDecoration(labelText: 'Estado (UF)'),
            maxLength: 2,
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _locating ? null : _useMyLocation,
            icon: _locating
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.my_location),
            label: Text(_latitude == null ? 'Ver prestadores disponíveis perto de mim' : 'Atualizar localização'),
          ),
          if (_locationError != null) ...[
            const SizedBox(height: 8),
            Text(_locationError!, style: TextStyle(color: AppColors.destructive)),
          ],
          if (_nearbyFuture != null) ...[
            const SizedBox(height: 12),
            FutureBuilder<List<NearbyProvider>>(
              future: _nearbyFuture,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const LinearProgressIndicator();
                }
                final providers = snapshot.data ?? const [];
                if (providers.isEmpty) {
                  return const Text('Nenhum prestador disponível perto de você no momento.');
                }
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${providers.length} prestador(es) disponível(is) perto de você:'),
                    const SizedBox(height: 4),
                    ...providers.take(5).map(
                          (p) => ListTile(
                            dense: true,
                            contentPadding: EdgeInsets.zero,
                            leading: const Icon(Icons.person_pin_circle_outlined),
                            title: Text(p.name),
                            subtitle: Text('${p.distanceKm.toStringAsFixed(1)} km de você'),
                            trailing: p.rating != null ? Text('⭐ ${p.rating!.toStringAsFixed(1)}') : null,
                          ),
                        ),
                  ],
                );
              },
            ),
          ],
          if (_isReboque) ...[
            const Divider(height: 32),
            Text('Destino do veículo', style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 8),
            TextField(
              controller: _deliveryAddressController,
              decoration: const InputDecoration(labelText: 'Endereço de destino'),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _deliveryNeighborhoodController,
                    decoration: const InputDecoration(labelText: 'Bairro'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _deliveryCityController,
                    decoration: const InputDecoration(labelText: 'Cidade'),
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 12),
          TextField(
            controller: _notesController,
            maxLines: 4,
            decoration: const InputDecoration(
              labelText: 'Descreva o problema (opcional)',
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 16),
          Text('Fotos do problema', style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              ..._photos.map(
                (p) => Chip(label: Text(p.name), onDeleted: () => setState(() => _photos.remove(p))),
              ),
              ActionChip(avatar: const Icon(Icons.add_a_photo, size: 18), label: const Text('Adicionar'), onPressed: _pickPhoto),
            ],
          ),
          if (_error != null) ...[
            const SizedBox(height: 16),
            Text(_error!, style: TextStyle(color: AppColors.destructive)),
          ],
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _submitting ? null : _confirm,
            child: Text(_submitting ? 'Enviando…' : 'Continuar para pagamento'),
          ),
        ],
      ),
    );
  }
}

/// Renderiza uma pergunta de `service_request_form_fields`. Tipos
/// conhecidos: `short_text`, `long_text`, `location` (GPS, sem mapa).
/// Qualquer outro tipo futuro cai no fallback de texto livre.
class _DynamicFormField extends StatelessWidget {
  const _DynamicFormField({
    required this.field,
    required this.controller,
    required this.onUseLocation,
    required this.locating,
  });

  final ServiceRequestFormField field;
  final TextEditingController controller;
  final VoidCallback? onUseLocation;
  final bool locating;

  @override
  Widget build(BuildContext context) {
    final label = field.isRequired ? '${field.label} *' : field.label;

    if (field.fieldType == 'location') {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: Theme.of(context).textTheme.bodyMedium),
          if (field.helpText != null) Text(field.helpText!, style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 4),
          OutlinedButton.icon(
            onPressed: locating ? null : onUseLocation,
            icon: const Icon(Icons.my_location, size: 18),
            label: Text(controller.text.isEmpty ? 'Usar minha localização' : 'Localização capturada ✓'),
          ),
        ],
      );
    }

    return TextField(
      controller: controller,
      maxLines: field.fieldType == 'long_text' ? 4 : 1,
      decoration: InputDecoration(labelText: label, helperText: field.helpText, alignLabelWithHint: true),
    );
  }
}
