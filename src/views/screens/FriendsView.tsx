import React from 'react';
import { ImageBackground, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { FriendsControllerState } from '../../controllers/useFriendsController';
import { catalogue } from '../../models/catalogue';
import { ChatMessage, Friend } from '../../models/types';
import { Avatar, Button, IconButton, SectionTitle } from '../components/ui';
import { PageTitle } from '../layout/AppNavigation';
import { colors } from '../styles/theme';
import { mainStyles as styles } from '../styles/mainStyles';

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function FriendRow({
  friend,
  active,
  roomSelected,
  roomMode,
  onOpen,
  onRoomToggle,
}: {
  friend: Friend;
  active?: boolean;
  roomSelected?: boolean;
  roomMode: boolean;
  onOpen: () => void;
  onRoomToggle: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={roomMode ? `${roomSelected ? 'Quitar' : 'Invitar'} a ${friend.name} de la sala` : `Abrir conversación con ${friend.name}`}
      onPress={roomMode ? onRoomToggle : onOpen}
      style={[styles.friendRow, ((roomMode && roomSelected) || (!roomMode && active)) && styles.friendRowSelected]}
    >
      <Avatar initials={friend.initials} size={48} color={friend.color} online={friend.online} />
      <View style={styles.friendCopy}>
        <Text style={styles.friendName}>{friend.name}</Text>
        <Text style={styles.friendStatus}>{roomMode ? friend.status : `${friend.handle} · ${friend.online ? 'En línea' : 'Desconectado'}`}</Text>
      </View>
      {!roomMode && <View style={styles.compatibility}><Text style={styles.compatibilityValue}>{friend.compatibility}%</Text><Text style={styles.compatibilityLabel}>afinidad</Text></View>}
      <View style={[styles.friendSelect, ((roomMode && roomSelected) || (!roomMode && active)) && styles.friendSelectActive]}>
        <Feather name={roomMode ? (roomSelected ? 'check' : 'plus') : 'message-circle'} size={16} color={((roomMode && roomSelected) || (!roomMode && active)) ? colors.ink : colors.textMuted} />
      </View>
    </Pressable>
  );
}

function MessageBubble({ message, friend }: { message: ChatMessage; friend: Friend }) {
  const mine = message.senderId === 'me';
  return (
    <View style={[styles.messageRow, mine && styles.messageRowMine]}>
      {!mine && <Avatar initials={friend.initials} size={28} color={friend.color} />}
      <View style={[styles.messageBubble, mine ? styles.messageBubbleMine : styles.messageBubbleFriend]}>
        <Text style={[styles.messageText, mine && styles.messageTextMine]}>{message.text}</Text>
        <View style={styles.messageMeta}>
          <Text style={[styles.messageTime, mine && styles.messageTimeMine]}>{message.sentAt}</Text>
          {mine && <Feather name={message.status === 'read' ? 'check-circle' : message.status === 'sending' ? 'clock' : message.status === 'failed' ? 'alert-circle' : 'check'} size={10} color={colors.ink} />}
        </View>
      </View>
    </View>
  );
}

function ModeTabs({ controller }: { controller: FriendsControllerState }) {
  return (
    <View style={styles.friendsModeTabs}>
      <Pressable onPress={() => controller.setMode('messages')} style={[styles.friendsModeTab, controller.mode === 'messages' && styles.friendsModeTabActive]}>
        <Feather name="message-circle" size={16} color={controller.mode === 'messages' ? colors.ink : colors.textMuted} />
        <Text style={[styles.friendsModeText, controller.mode === 'messages' && styles.friendsModeTextActive]}>Mensajes</Text>
      </Pressable>
      <Pressable onPress={() => controller.setMode('room')} style={[styles.friendsModeTab, controller.mode === 'room' && styles.friendsModeTabActive]}>
        <Feather name="video" size={16} color={controller.mode === 'room' ? colors.ink : colors.textMuted} />
        <Text style={[styles.friendsModeText, controller.mode === 'room' && styles.friendsModeTextActive]}>Sala simultánea</Text>
      </Pressable>
    </View>
  );
}

function DirectMessages({ controller }: { controller: FriendsControllerState }) {
  const friend = controller.activeFriend;
  if (!friend) return <View style={styles.chatEmpty}><Feather name="users" size={28} color={colors.textDim} /><Text style={styles.chatEmptyTitle}>Agrega un amigo para conversar</Text></View>;

  return (
    <View style={styles.directChat}>
      <View style={styles.directChatHeader}>
        <Avatar initials={friend.initials} size={46} color={friend.color} online={friend.online} />
        <View style={styles.directChatHeaderCopy}><Text style={styles.directChatName}>{friend.name}</Text><Text style={styles.directChatPresence}>{friend.online ? 'En línea ahora' : 'Responderá cuando vuelva'}</Text></View>
        <Pressable accessibilityLabel={`Invitar a ${friend.name} a una sala`} onPress={() => { if (!controller.selectedRoomIds.includes(friend.id)) controller.toggleRoomParticipant(friend.id); controller.setMode('room'); }} style={styles.videoInviteButton}><Feather name="video" size={18} color={colors.lime} /></Pressable>
        <IconButton icon="user-x" label={`Eliminar amistad con ${friend.name}`} onPress={controller.removeActiveFriend} />
        <IconButton icon="slash" label={`Bloquear a ${friend.name}`} onPress={controller.blockActiveFriend} />
      </View>
      <ScrollView style={styles.directMessagesScroll} contentContainerStyle={styles.directMessagesContent} showsVerticalScrollIndicator={false}>
        {!controller.activeDirectMessages.length ? (
          <View style={styles.chatEmpty}><Feather name="message-circle" size={29} color={colors.textDim} /><Text style={styles.chatEmptyTitle}>Inicia la conversación</Text><Text style={styles.chatEmptyText}>Comparte una recomendación o invítale a ver algo contigo.</Text></View>
        ) : controller.activeDirectMessages.map((message) => <MessageBubble key={message.id} message={message} friend={friend} />)}
      </ScrollView>
      <View style={styles.messageComposer}>
        <TextInput
          accessibilityLabel={`Mensaje para ${friend.name}`}
          value={controller.directDraft}
          onChangeText={controller.setDirectDraft}
          onSubmitEditing={controller.sendDirectMessage}
          placeholder={`Escribe a ${friend.name.split(' ')[0]}…`}
          placeholderTextColor={colors.textDim}
          returnKeyType="send"
          style={styles.messageInput}
        />
        <Pressable accessibilityRole="button" accessibilityLabel={`Enviar mensaje a ${friend.name}`} disabled={!controller.directDraft.trim()} onPress={controller.sendDirectMessage} style={[styles.messageSendButton, !controller.directDraft.trim() && styles.messageSendButtonDisabled]}><Feather name="send" size={18} color={colors.ink} /></Pressable>
      </View>
    </View>
  );
}

function RoomChat({ controller }: { controller: FriendsControllerState }) {
  const fallbackFriend = controller.selectedRoomFriends[0] ?? controller.activeFriend;
  return (
    <View style={styles.chatBox}>
      <View style={styles.roomChatHeader}><Text style={styles.roomChatTitle}>Chat de la sala</Text><Text style={styles.roomChatCount}>{controller.roomMessages.length} mensajes</Text></View>
      <ScrollView style={styles.roomMessagesScroll} contentContainerStyle={styles.roomMessagesContent} showsVerticalScrollIndicator={false}>
        {fallbackFriend && controller.roomMessages.map((message) => <MessageBubble key={message.id} message={message} friend={fallbackFriend} />)}
      </ScrollView>
      <View style={styles.chatInputRow}>
        <TextInput accessibilityLabel="Mensaje para la sala" value={controller.roomDraft} onChangeText={controller.setRoomDraft} onSubmitEditing={controller.sendRoomMessage} placeholder="Mensaje para todos…" placeholderTextColor={colors.textDim} returnKeyType="send" style={styles.chatInput} />
        <Pressable accessibilityRole="button" accessibilityLabel="Enviar mensaje a la sala" disabled={!controller.roomDraft.trim()} onPress={controller.sendRoomMessage} style={[styles.sendButton, !controller.roomDraft.trim() && styles.messageSendButtonDisabled]}><Feather name="send" size={17} color={colors.ink} /></Pressable>
      </View>
    </View>
  );
}

function SimultaneousRoom({ controller }: { controller: FriendsControllerState }) {
  if (!controller.roomActive) {
    return (
      <View style={styles.roomEmpty}>
        <LinearGradient colors={['rgba(200,255,90,0.14)', 'rgba(111,168,255,0.05)']} style={styles.roomArt}><View style={styles.roomArtCore}><Feather name="play" size={31} color={colors.ink} /></View><View style={[styles.roomOrbit, styles.roomOrbitOne]}><Avatar initials="TÚ" size={34} color="#5E4EA1" online /></View>{controller.selectedRoomFriends[0] && <View style={[styles.roomOrbit, styles.roomOrbitTwo]}><Avatar initials={controller.selectedRoomFriends[0].initials} size={34} color={controller.selectedRoomFriends[0].color} online /></View>}</LinearGradient>
        <Text style={styles.roomEmptyTitle}>Empiecen al mismo tiempo</Text>
        <Text style={styles.roomEmptyText}>Selecciona amigos en la lista. Los controles y los mensajes de esta sala se comparten entre todos los invitados.</Text>
        <View style={styles.selectedPeople}>{controller.selectedRoomFriends.map((friend) => <View key={friend.id} style={styles.selectedPerson}><Avatar initials={friend.initials} size={27} color={friend.color} /><Text style={styles.selectedName}>{friend.name.split(' ')[0]}</Text><Pressable accessibilityLabel={`Quitar a ${friend.name}`} onPress={() => controller.toggleRoomParticipant(friend.id)}><Feather name="x" size={13} color={colors.textMuted} /></Pressable></View>)}</View>
        <Button label="Crear sala privada" icon="video" disabled={!controller.selectedRoomIds.length} onPress={controller.createRoom} />
        <View style={styles.joinRoomRow}><TextInput accessibilityLabel="Código de invitación" value={controller.joinCode} onChangeText={controller.setJoinCode} autoCapitalize="characters" maxLength={10} placeholder="Código de sala" placeholderTextColor={colors.textDim} style={styles.messageInput} /><Button label="Unirme" icon="log-in" disabled={!controller.joinCode.trim()} onPress={controller.joinRoomByCode} /></View>
        <Text style={styles.legalNote}>PYSUP no transmite ni captura el contenido audiovisual.</Text>
      </View>
    );
  }

  return (
    <View style={styles.activeRoom}>
      <View style={styles.activeRoomTop}><View><Text style={styles.roomKicker}>SALA PRIVADA · {controller.selectedRoomIds.length + 1} PERSONAS</Text><Text style={styles.activeRoomTitle}>{controller.roomTitle}</Text><Text selectable style={styles.roomInviteLink}>pysup://room/{controller.roomInviteCode}</Text></View><View style={styles.livePill}><View style={styles.liveSmall} /><Text style={styles.liveText}>EN LÍNEA</Text></View></View>
      <ImageBackground source={catalogue[0].image} style={styles.roomPlayer} imageStyle={styles.roomPlayerRadius}>
        <LinearGradient colors={['rgba(7,10,18,0.2)', 'rgba(7,10,18,0.9)']} style={styles.roomPlayerOverlay}>
          <Pressable disabled={!controller.roomCanControl} accessibilityLabel={controller.roomCanControl ? (controller.playing ? 'Pausar para todos' : 'Reproducir para todos') : 'Sólo el anfitrión puede controlar la reproducción'} onPress={controller.togglePlaying} style={[styles.playButton, !controller.roomCanControl && { opacity: 0.5 }]}><Feather name={controller.playing ? 'pause' : 'play'} size={28} color={colors.ink} /></Pressable>
          <View style={styles.playerBottom}><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(100, (controller.seconds / 7200) * 100)}%` }]} /></View><View style={styles.timeRow}><Text style={styles.timeText}>{formatTime(controller.seconds)}</Text><Text style={styles.syncText}><Feather name="link" size={12} color={colors.success} /> Reloj de sala</Text><Text style={styles.timeText}>cada cuenta reproduce en su plataforma</Text></View></View>
        </LinearGradient>
      </ImageBackground>
      <View style={styles.playerControls}><IconButton icon="rotate-ccw" label="Retroceder 10 segundos" onPress={controller.rewind} /><Button label={controller.roomCanControl ? (controller.playing ? 'Pausar para todos' : 'Reproducir para todos') : 'Controlado por el anfitrión'} icon={controller.playing ? 'pause' : 'play'} disabled={!controller.roomCanControl} onPress={controller.togglePlaying} style={styles.playerMainControl} /><IconButton icon="rotate-cw" label="Avanzar 10 segundos" onPress={controller.forward} /></View>
      <RoomChat controller={controller} />
      <Button label={controller.roomIsHost ? 'Cerrar sala' : 'Salir de la sala'} icon="x" variant="danger" onPress={controller.closeRoom} />
    </View>
  );
}

export function FriendsScreen({ controller }: { controller: FriendsControllerState }) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <PageTitle eyebrow="TU CÍRCULO" title="Amigos, mensajes y salas" description="Conversa con tus amigos o invítalos a una función sincronizada con chat para todos." />
      <ModeTabs controller={controller} />
      <View style={styles.friendsLayout}>
        <View style={styles.friendsPanel}>
          <SectionTitle title={controller.mode === 'messages' ? 'Tus conversaciones' : 'Invitar a la sala'} />
          {!!controller.friendRequests.length && <View style={styles.suggestionCard}><Text style={styles.suggestionLabel}>SOLICITUDES DE AMISTAD</Text>{controller.friendRequests.map((request) => <View key={request.id} style={[styles.suggestedFriendRow, controller.focusedRequestId === request.id && styles.friendRowSelected]}><Avatar initials={request.name.slice(0, 2).toUpperCase()} size={44} color="#5E4EA1" /><View style={styles.friendCopy}><Text style={styles.friendName}>{request.name}</Text><Text style={styles.friendStatus}>@{request.username}</Text></View><Button label="Rechazar" compact variant="ghost" onPress={() => controller.respondFriendRequest(request.id, false)} /><Button label="Aceptar" compact onPress={() => controller.respondFriendRequest(request.id, true)} /></View>)}</View>}
          <View style={styles.searchBox}><Feather name="search" size={17} color={colors.textDim} /><TextInput value={controller.query} onChangeText={controller.setQuery} placeholder="Buscar por nombre o @usuario" placeholderTextColor={colors.textDim} style={styles.searchInput} /></View>
          <View style={styles.friendList}>{controller.filteredFriends.map((friend) => <FriendRow key={friend.id} friend={friend} active={controller.activeFriendId === friend.id} roomSelected={controller.selectedRoomIds.includes(friend.id)} roomMode={controller.mode === 'room'} onOpen={() => controller.openConversation(friend.id)} onRoomToggle={() => controller.toggleRoomParticipant(friend.id)} />)}</View>
          {controller.showSuggestion && <View style={styles.suggestionCard}><Text style={styles.suggestionLabel}>RESULTADO DE BÚSQUEDA</Text><View style={styles.suggestedFriendRow}><Avatar initials={controller.suggestedFriend.initials} size={48} color={controller.suggestedFriend.color} online /><View style={styles.friendCopy}><Text style={styles.friendName}>{controller.suggestedFriend.name}</Text><Text style={styles.friendStatus}>{controller.suggestedFriend.handle}</Text></View><Button label="Enviar solicitud" icon="user-plus" compact onPress={controller.addSuggestedFriend} /></View></View>}
        </View>
        <View style={[styles.roomPanel, controller.mode === 'messages' && styles.messagePanel]}>{controller.mode === 'messages' ? <DirectMessages controller={controller} /> : <SimultaneousRoom controller={controller} />}</View>
      </View>
    </ScrollView>
  );
}
