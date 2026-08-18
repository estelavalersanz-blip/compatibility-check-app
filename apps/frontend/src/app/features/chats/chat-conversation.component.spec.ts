import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Conversation, Message } from '@compatibility-check-app/shared-types';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { ChatService } from '../../core/chat.service';
import { ChatConversationComponent } from './chat-conversation.component';

const MY_USER_ID = 'user-me';
const OTHER_USER_ID = 'user-2';

function fakeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: `msg-${Math.floor(Math.random() * 100000)}`,
    conversationId: 'conv-1',
    senderId: OTHER_USER_ID,
    body: 'Hola',
    createdAt: '2024-03-15T10:00:00.000Z',
    readAt: null,
    ...overrides,
  };
}

function fakeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conv-1',
    otherParticipant: {
      id: OTHER_USER_ID,
      name: 'Nombre completo',
      alias: 'bea',
      photoUrl: 'https://example.com/bea.jpg',
      questionnaireCompletedAt: '2024-01-01T00:00:00.000Z',
    },
    lastMessage: null,
    unreadCount: 0,
    ...overrides,
  };
}

function setup(options: {
  messages?: Message[];
  conversations?: Conversation[];
  sendMessageSpy?: jasmine.Spy;
} = {}) {
  const getMessagesSpy = jasmine
    .createSpy('getMessages')
    .and.returnValue(of(options.messages ?? [fakeMessage()]));
  const listConversationsSpy = jasmine
    .createSpy('listConversations')
    .and.returnValue(of(options.conversations ?? [fakeConversation()]));
  const sendMessageSpy =
    options.sendMessageSpy ??
    jasmine.createSpy('sendMessage').and.callFake((_id: string, body: string) => of(fakeMessage({ senderId: MY_USER_ID, body })));

  TestBed.configureTestingModule({
    imports: [ChatConversationComponent],
    providers: [
      provideRouter([{ path: 'chats', component: ChatConversationComponent }]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ id: 'conv-1' }) } },
      },
      {
        provide: AuthService,
        useValue: { session: () => ({ user: { id: MY_USER_ID } }) },
      },
      {
        provide: ChatService,
        useValue: {
          getMessages: getMessagesSpy,
          listConversations: listConversationsSpy,
          sendMessage: sendMessageSpy,
        },
      },
    ],
  });

  const fixture = TestBed.createComponent(ChatConversationComponent);
  fixture.detectChanges();
  return { fixture, getMessagesSpy, listConversationsSpy, sendMessageSpy };
}

function root(fixture: ComponentFixture<ChatConversationComponent>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

async function loaded(fixture: ComponentFixture<ChatConversationComponent>): Promise<void> {
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('ChatConversationComponent — mensajes (tarea 17b.3)', () => {
  it('muestra los mensajes en orden cronológico y distingue los propios de los del otro participante', async () => {
    const { fixture } = setup({
      messages: [
        fakeMessage({ id: 'm1', senderId: OTHER_USER_ID, body: 'Hola' }),
        fakeMessage({ id: 'm2', senderId: MY_USER_ID, body: 'Qué tal' }),
      ],
    });
    await loaded(fixture);
    const view = root(fixture);

    const bubbles = Array.from(view.querySelectorAll('.chat-message'));
    expect(bubbles.length).toBe(2);
    expect(bubbles[0].textContent).toContain('Hola');
    expect(bubbles[0].classList.contains('chat-message--mine')).toBe(false);
    expect(bubbles[1].textContent).toContain('Qué tal');
    expect(bubbles[1].classList.contains('chat-message--mine')).toBe(true);
  });

  it('muestra el alias del otro participante en la cabecera', async () => {
    const { fixture } = setup({ conversations: [fakeConversation({ otherParticipant: { ...fakeConversation().otherParticipant, alias: 'cleo' } })] });
    await loaded(fixture);

    expect(root(fixture).querySelector('.card-header')?.textContent).toContain('cleo');
  });

  it('envía un mensaje nuevo con el campo de texto del card-footer y limpia el campo', async () => {
    const sendMessageSpy = jasmine
      .createSpy('sendMessage')
      .and.returnValue(of(fakeMessage({ id: 'm-new', senderId: MY_USER_ID, body: 'Mensaje nuevo' })));
    const { fixture } = setup({ sendMessageSpy });
    await loaded(fixture);
    const view = root(fixture);

    const input = view.querySelector<HTMLInputElement>('.card-footer input');
    if (!input) {
      throw new Error('No se encontró el input del card-footer');
    }
    input.value = 'Mensaje nuevo';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const sendButton = view.querySelector<HTMLButtonElement>('.card-footer button');
    sendButton?.click();
    await loaded(fixture);

    expect(sendMessageSpy).toHaveBeenCalledWith('conv-1', 'Mensaje nuevo');
    expect(root(fixture).textContent).toContain('Mensaje nuevo');
    expect(input.value).toBe('');
  });

  it('el botón de enviar permanece deshabilitado con el campo vacío', async () => {
    const { fixture } = setup();
    await loaded(fixture);

    const sendButton = root(fixture).querySelector<HTMLButtonElement>('.card-footer button');
    expect(sendButton?.disabled).toBe(true);
  });
});

describe('ChatConversationComponent — scroll automático (tarea 17b.3)', () => {
  it('hace scroll hasta el último mensaje al entrar, cuando el historial no cabe en pantalla', async () => {
    const manyMessages = Array.from({ length: 40 }, (_, i) =>
      fakeMessage({ id: `m${i}`, body: `Mensaje número ${i} con algo de texto para ocupar espacio real` }),
    );
    const { fixture } = setup({ messages: manyMessages });
    await loaded(fixture);
    await loaded(fixture); // segunda pasada: da margen a afterNextRender para ejecutar el scroll

    const container = root(fixture).querySelector<HTMLElement>('.chat-messages');
    expect(container).not.toBeNull();
    expect(container!.scrollHeight).toBeGreaterThan(container!.clientHeight);
    expect(container!.scrollTop).toBeGreaterThan(0);
  });
});
