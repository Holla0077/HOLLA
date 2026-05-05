import prisma from '@/src/shared/database/prisma';
import type { TicketStatus } from '@prisma/client';

export class SupportService {
  // User creates a ticket
  static async createTicket(userId: string, subject: string, initialMessage: string) {
    return prisma.supportTicket.create({
      data: {
        userId,
        subject,
        messages: {
          create: {
            senderId: userId,
            content: initialMessage,
          },
        },
      },
      include: { messages: true },
    });
  }

  // Agent or user adds a message
  static async addMessage(ticketId: string, senderId: string, content: string) {
    return prisma.ticketMessage.create({
      data: { ticketId, senderId, content },
    });
  }

  // Agent changes ticket status
  static async updateTicketStatus(ticketId: string, status: TicketStatus, assignedTo?: string) {
    return prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status, ...(assignedTo !== undefined ? { assignedTo } : {}) },
    });
  }

  // Get all tickets (admin/agent)
  static async getAllTickets(filters?: { status?: TicketStatus; assignedTo?: string }) {
    return prisma.supportTicket.findMany({
      where: filters,
      include: { user: { select: { email: true, username: true } }, messages: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // Get a single ticket
  static async getTicket(ticketId: string) {
    return prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { user: true, messages: { orderBy: { createdAt: 'asc' } } },
    });
  }
}