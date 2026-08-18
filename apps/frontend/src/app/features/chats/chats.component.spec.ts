import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Conversation } from '@compatibility-check-app/shared-types';
import { of } from 'rxjs';
import { ChatService } from '../../core/chat.service';
import { ChatsComponent } from './chats.component';

@Component({ selector: 'app-chats-test-blank', standalone: true, template: '' })
class BlankComponent {}

function fakeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conv-1',
    otherParticipant: {
      id: 'user-2',
      name: 'Nombre completo, nunca mostrado aquí',
      alias: 'bea',
      photoUrl: 'https://example.com/bea.jpg',
      questionnaireCompletedAt: '2024-01-01T00:00:00.000Z',
    },
    lastMessage: {
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'user-2',
      body: 'Hola, ¿qué tal?',
      createdAt: '2024-06-01T10:00:00.000Z',
      readAt: null,
    },
    unreadCount: 0,
    ...overrides,
  };
}

function setup(options: { listConversations?: jasmine.Spy } = {}) {
  const listConversationsSpy =
    options.listConversations ??
    jasmine.createSpy('listConversations').and.returnValue(of([fakeConversation()]));

  TestBed.configureTestingModule({
    imports: [ChatsComponent],
    providers: [
      provideRouter([{ path: 'chats/:id', component: BlankComponent }]),
      { provide: ChatService, useValue: { listConversations: listConversationsSpy } },
    ],
  });

  const fixture = TestBed.createComponent(ChatsComponent);
  fixture.detectChanges();
  return { fixture, listConversationsSpy };
}

function root(fixture: ComponentFixture<ChatsComponent>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function rows(fixture: ComponentFixture<ChatsComponent>): HTMLButtonElement[] {
  return Array.from(root(fixture).querySelectorAll<HTMLButtonElement>('.list-group-item'));
}

describe('ChatsComponent — listado (tarea 17b.1)', () => {
  it('muestra una fila por conversación con foto, alias, último mensaje y su fecha', () => {
    const { fixture } = setup();
    const rowList = rows(fixture);
    expect(rowList.length).toBe(1);

    const row = rowList[0];
    expect(row.querySelector('img')?.getAttribute('src')).toBe('https://example.com/bea.jpg');
    expect(row.textContent).toContain('bea');
    expect(row.textContent).not.toContain('Nombre completo, nunca mostrado aquí');
    expect(row.textContent).toContain('Hola, ¿qué tal?');
    // Fecha del último mensaje — no se compara un formato exacto (depende del locale/formato: `short`
    // usa año de 2 dígitos, `longDate` usaría 4), solo que se muestre algo derivado de `createdAt`.
    // "24" es la subcadena común a ambos casos para este dato de prueba (2024-06-01).
    expect(row.textContent).toContain('24');
  });

  it('las mantiene en el orden recibido del backend (ya llegan ordenadas por actividad reciente)', () => {
    const conversations = [
      fakeConversation({ id: 'conv-recent', otherParticipant: { ...fakeConversation().otherParticipant, alias: 'reciente' } }),
      fakeConversation({ id: 'conv-old', otherParticipant: { ...fakeConversation().otherParticipant, alias: 'antigua' } }),
    ];
    const { fixture } = setup({
      listConversations: jasmine.createSpy('listConversations').and.returnValue(of(conversations)),
    });

    const rowList = rows(fixture);
    expect(rowList[0].textContent).toContain('reciente');
    expect(rowList[1].textContent).toContain('antigua');
  });

  it('marca visualmente las conversaciones con mensajes sin leer', () => {
    const conversations = [
      fakeConversation({ id: 'conv-unread', unreadCount: 3 }),
      fakeConversation({ id: 'conv-read', unreadCount: 0 }),
    ];
    const { fixture } = setup({
      listConversations: jasmine.createSpy('listConversations').and.returnValue(of(conversations)),
    });

    const rowList = rows(fixture);
    expect(rowList[0].querySelector('.badge')?.textContent?.trim()).toBe('3');
    expect(rowList[1].querySelector('.badge')).toBeNull();
  });

  it('sin ninguna conversación, muestra un aviso en vez de una lista vacía', () => {
    const { fixture } = setup({
      listConversations: jasmine.createSpy('listConversations').and.returnValue(of([])),
    });

    expect(root(fixture).querySelector('.alert-warning')).not.toBeNull();
    expect(rows(fixture).length).toBe(0);
  });

  it('cada fila navega a /chats/:id al pulsarla', async () => {
    const { fixture } = setup();
    rows(fixture)[0].click();
    await fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/chats/conv-1');
  });
});
