import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:reparo_shared/reparo_shared.dart';
import 'package:url_launcher/url_launcher.dart';

/// Porta de `legacy/src/components/PaymentModal.jsx` +
/// `PixPaymentModal.jsx` + `CouponInput.jsx`. Cartão abre o Checkout
/// hospedado do Stripe no navegador (sem SDK nativo embutido). PIX mostra
/// o código "copia e cola" (sem renderizar QR visual ainda). Sem detecção
/// automática de pagamento confirmado — o usuário segue manualmente para
/// "Meus pedidos" depois de pagar.
class PaymentScreen extends StatefulWidget {
  const PaymentScreen({super.key, required this.request});

  final ServiceRequest request;

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  final _repository = PaymentRepository(ReparoSupabase.client);
  final _couponController = TextEditingController();
  CouponValidation? _coupon;
  bool _validatingCoupon = false;
  bool _processing = false;
  String? _error;
  Map<String, dynamic>? _pixData;

  num get _baseAmount => 100; // preço final ainda não é calculado nesta versão simplificada.
  num get _finalAmount => _coupon?.finalAmount ?? _baseAmount;

  @override
  void dispose() {
    _couponController.dispose();
    super.dispose();
  }

  Future<void> _applyCoupon() async {
    final code = _couponController.text.trim();
    if (code.isEmpty) return;
    setState(() => _validatingCoupon = true);
    try {
      final result = await _repository.validateCoupon(
        couponCode: code,
        amount: _baseAmount,
        professionId: widget.request.professionId,
      );
      setState(() => _coupon = result);
      if (!result.valid && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(result.message ?? 'Cupom inválido')));
      }
    } finally {
      if (mounted) setState(() => _validatingCoupon = false);
    }
  }

  Future<void> _payWithCard() async {
    setState(() {
      _processing = true;
      _error = null;
    });
    try {
      final url = await _repository.createCheckoutSession(
        serviceRequestId: widget.request.id,
        amount: _finalAmount,
        serviceName: widget.request.serviceLabel,
        couponId: _coupon?.couponId,
        couponCode: _coupon?.couponCode,
        discountAmount: _coupon?.discountAmount,
        originalPrice: _baseAmount,
      );
      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    } catch (e) {
      setState(() => _error = 'Não foi possível iniciar o pagamento. Tente novamente.');
    } finally {
      if (mounted) setState(() => _processing = false);
    }
  }

  Future<void> _payWithPix() async {
    setState(() {
      _processing = true;
      _error = null;
    });
    try {
      final data = await _repository.generatePixCode(requestId: widget.request.id, amount: _finalAmount);
      setState(() => _pixData = data);
    } catch (e) {
      setState(() => _error = 'Não foi possível gerar o PIX. Tente novamente.');
    } finally {
      if (mounted) setState(() => _processing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Pagamento')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text('Total: R\$ ${_finalAmount.toStringAsFixed(2)}', style: Theme.of(context).textTheme.headlineSmall),
          if (_coupon?.valid == true) ...[
            const SizedBox(height: 4),
            Text('Cupom aplicado: -R\$ ${_coupon!.discountAmount?.toStringAsFixed(2)}'),
          ],
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _couponController,
                  decoration: const InputDecoration(labelText: 'Cupom de desconto'),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: _validatingCoupon ? null : _applyCoupon,
                child: Text(_validatingCoupon ? '...' : 'Aplicar'),
              ),
            ],
          ),
          const SizedBox(height: 32),
          if (_pixData == null) ...[
            ElevatedButton.icon(
              icon: const Icon(Icons.credit_card),
              label: const Text('Pagar com cartão (Stripe)'),
              onPressed: _processing ? null : _payWithCard,
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              icon: const Icon(Icons.qr_code),
              label: const Text('Pagar com PIX'),
              onPressed: _processing ? null : _payWithPix,
            ),
          ] else ...[
            Text('Copie o código PIX abaixo no app do seu banco:', style: Theme.of(context).textTheme.bodyMedium),
            const SizedBox(height: 8),
            SelectableText(
              _pixData!['qrCodeData'] as String? ?? '',
              style: const TextStyle(fontFamily: 'monospace'),
            ),
          ],
          if (_error != null) ...[
            const SizedBox(height: 16),
            Text(_error!, style: TextStyle(color: AppColors.destructive)),
          ],
          const SizedBox(height: 32),
          TextButton(
            onPressed: () => context.go('/orders'),
            child: const Text('Já paguei — ver meus pedidos'),
          ),
        ],
      ),
    );
  }
}
