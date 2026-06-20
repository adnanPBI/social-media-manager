import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/inbox',
})
export class InboxGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  
  private readonly logger = new Logger(InboxGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    const workspaceId = client.handshake.query.workspaceId as string;
    if (workspaceId) {
      client.join(workspaceId);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  broadcastNewMessage(workspaceId: string, payload: any) {
    this.server.to(workspaceId).emit('newMessage', payload);
  }
}
