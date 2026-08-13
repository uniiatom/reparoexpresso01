import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:reparo_shared/reparo_shared.dart';

import '../pdf_report.dart';

class ServiceRequestsTab extends StatefulWidget {
  const ServiceRequestsTab({super.key});

  @override
  State<ServiceRequestsTab> createState() => _ServiceRequestsTabState();
}

class _ServiceRequestsTabState extends State<ServiceRequestsTab> {
  late final _stream = ServiceRequestRepository(ReparoSupabase.client).watchAllForStaff();
  final _dateFormat = DateFormat('dd/MM HH:mm');
  ServiceRequestStatus? _statusFilter;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<ServiceRequest>>(
      stream: _stream,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(child: Text('Erro: ${snapshot.error}'));
        }
        final all = snapshot.data ?? const [];
        final rows = _statusFilter == null
            ? all
            : all.where((r) => r.status == _statusFilter).toList();

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Text('${rows.length} de ${all.length} OS', style: Theme.of(context).textTheme.bodyMedium),
                  const SizedBox(width: 16),
                  DropdownMenu<ServiceRequestStatus?>(
                    label: const Text('Filtrar status'),
                    initialSelection: _statusFilter,
                    onSelected: (v) => setState(() => _statusFilter = v),
                    dropdownMenuEntries: [
                      const DropdownMenuEntry(value: null, label: 'Todos'),
                      ...ServiceRequestStatus.values.map(
                        (s) => DropdownMenuEntry(value: s, label: s.label),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: SingleChildScrollView(
                  child: DataTable(
                    columns: const [
                      DataColumn(label: Text('Serviço')),
                      DataColumn(label: Text('Cliente')),
                      DataColumn(label: Text('Prestador')),
                      DataColumn(label: Text('Status')),
                      DataColumn(label: Text('Criada em')),
                      DataColumn(label: Text('Relatório')),
                    ],
                    rows: rows.map((r) {
                      return DataRow(
                        cells: [
                          DataCell(Text(r.serviceLabel)),
                          DataCell(Text(r.clientName ?? '—')),
                          DataCell(Text(r.providerName ?? '—')),
                          DataCell(Chip(label: Text(r.status.label))),
                          DataCell(Text(_dateFormat.format(r.createdAt.toLocal()))),
                          DataCell(
                            IconButton(
                              icon: const Icon(Icons.picture_as_pdf, size: 20),
                              tooltip: 'Gerar PDF',
                              onPressed: () => generateServiceReportPdf(r),
                            ),
                          ),
                        ],
                      );
                    }).toList(),
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}
