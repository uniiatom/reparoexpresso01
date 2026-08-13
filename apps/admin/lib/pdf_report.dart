import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:reparo_shared/reparo_shared.dart';

/// Porta de `legacy/src/components/ServiceReportGenerator.jsx` (que usava
/// `jsPDF`) — aqui com o pacote `pdf`/`printing`, puro Dart, sem
/// credencial externa. `Printing.sharePdf` dispara o download do arquivo
/// no navegador (Flutter Web).
Future<void> generateServiceReportPdf(ServiceRequest order) async {
  final dateFormat = DateFormat('dd/MM/yyyy HH:mm');
  final doc = pw.Document();

  doc.addPage(
    pw.Page(
      pageFormat: PdfPageFormat.a4,
      build: (context) => pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text('Relatório de Serviço', style: pw.TextStyle(fontSize: 20, fontWeight: pw.FontWeight.bold)),
          pw.SizedBox(height: 4),
          pw.Text('OS ${order.serviceNumber ?? order.id}'),
          pw.Divider(),
          pw.SizedBox(height: 12),
          _row('Serviço', order.serviceLabel),
          _row('Status', order.status.label),
          _row('Cliente', order.clientName ?? '—'),
          _row('Prestador', order.providerName ?? '—'),
          _row('Endereço', [order.address, order.neighborhood, order.city, order.state].nonNulls.join(', ')),
          _row('Criada em', dateFormat.format(order.createdAt)),
          if (order.finalPrice != null) _row('Valor final', 'R\$ ${order.finalPrice!.toStringAsFixed(2)}'),
          if (order.ratingClient != null) _row('Avaliação', '${order.ratingClient} estrelas'),
          if (order.description != null) ...[
            pw.SizedBox(height: 12),
            pw.Text('Descrição:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
            pw.Text(order.description!),
          ],
        ],
      ),
    ),
  );

  await Printing.sharePdf(bytes: await doc.save(), filename: 'relatorio-${order.serviceNumber ?? order.id}.pdf');
}

pw.Widget _row(String label, String value) {
  return pw.Padding(
    padding: const pw.EdgeInsets.symmetric(vertical: 2),
    child: pw.Row(
      children: [
        pw.SizedBox(width: 120, child: pw.Text(label, style: pw.TextStyle(fontWeight: pw.FontWeight.bold))),
        pw.Expanded(child: pw.Text(value)),
      ],
    ),
  );
}
