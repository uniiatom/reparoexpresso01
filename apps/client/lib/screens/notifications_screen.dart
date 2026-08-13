import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:reparo_shared/reparo_shared.dart';

/// Porta de `legacy/src/components/NotificationCenter.jsx`.
class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final repository = ClientNotificationRepository(ReparoSupabase.client);
    final dateFormat = DateFormat('dd/MM HH:mm');

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notificações'),
        actions: [
          IconButton(
            icon: const Icon(Icons.done_all),
            tooltip: 'Marcar todas como lidas',
            onPressed: repository.markAllAsRead,
          ),
        ],
      ),
      body: StreamBuilder<List<ClientNotification>>(
        stream: repository.watchMine(),
        builder: (context, snapshot) {
          final notifications = snapshot.data ?? const [];
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (notifications.isEmpty) {
            return const Center(child: Text('Nenhuma notificação ainda.'));
          }
          return ListView.builder(
            itemCount: notifications.length,
            itemBuilder: (context, index) {
              final n = notifications[index];
              return ListTile(
                tileColor: n.isRead ? null : AppColors.primary.withValues(alpha: 0.08),
                leading: const Icon(Icons.notifications),
                title: Text(n.title ?? n.type ?? 'Notificação'),
                subtitle: Text(n.message ?? ''),
                trailing: Text(dateFormat.format(n.createdAt.toLocal())),
                onTap: () => repository.markAsRead(n.id),
              );
            },
          );
        },
      ),
    );
  }
}
