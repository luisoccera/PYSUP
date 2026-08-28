import React, { useEffect, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ForumReply, ForumTopic } from '../../models/types';
import { Avatar, Button, IconButton, Pill } from '../components/ui';
import { PageTitle } from '../layout/AppNavigation';
import { colors } from '../styles/theme';
import { mainStyles as styles } from '../styles/mainStyles';

function TopicCard({ topic, highlighted, onOpen }: { topic: ForumTopic; highlighted?: boolean; onOpen: () => void }) {
  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [styles.topicCard, highlighted && styles.topicCardHighlighted, pressed && styles.cardPressed]}>
      <View style={styles.topicTop}>
        <Avatar initials={topic.initials} size={38} color={topic.kind === 'identify' ? '#457B9D' : '#6B5CA5'} />
        <View style={styles.topicAuthor}><Text style={styles.topicAuthorName}>{topic.author}</Text><Text style={styles.topicTime}>{topic.time}</Text></View>
        {topic.kind === 'identify' && <View style={[styles.solvedPill, topic.solved && styles.solvedPillActive]}><Feather name={topic.solved ? 'check-circle' : 'search'} size={12} color={topic.solved ? colors.ink : colors.blue} /><Text style={[styles.solvedText, topic.solved && styles.solvedTextActive]}>{topic.solved ? 'Resuelto' : 'Buscando'}</Text></View>}
      </View>
      <Text style={styles.topicTitle}>{topic.title}</Text>
      <Text numberOfLines={3} style={styles.topicBody}>{topic.body}</Text>
      <View style={styles.topicTags}>{topic.tags.map((tag) => <Pill key={tag} label={tag} />)}</View>
      <View style={styles.topicFooter}>
        <View style={styles.topicMetric}><Feather name="message-circle" size={15} color={colors.textMuted} /><Text style={styles.topicMetricText}>{topic.replies} respuestas</Text></View>
        <View style={styles.topicMetric}><Feather name="heart" size={15} color={colors.textMuted} /><Text style={styles.topicMetricText}>{topic.likes}</Text></View>
        <View style={styles.topicOpen}><Text style={styles.topicOpenText}>Abrir conversación</Text><Feather name="arrow-right" size={14} color={colors.lime} /></View>
      </View>
    </Pressable>
  );
}

type ForumScreenProps = {
  topics: ForumTopic[];
  hideSpoilers: boolean;
  onCreate: (topic: ForumTopic) => Promise<ForumTopic>;
  onLoadReplies: (topicId: string) => Promise<ForumReply[]>;
  onSubscribeReplies: (topicId: string, onReplies: (items: ForumReply[]) => void) => () => void;
  onReply: (topicId: string, body: string, spoiler: boolean) => Promise<ForumReply>;
  onUpdateReply: (replyId: string, body: string, spoiler: boolean) => Promise<void>;
  onDeleteReply: (replyId: string) => Promise<void>;
  onLike: (topicId: string, liked: boolean) => Promise<unknown>;
  onAcceptReply: (topicId: string, replyId: string) => Promise<unknown>;
  onUpdate: (topicId: string, title: string, body: string) => Promise<void>;
  onDelete: (topicId: string) => Promise<void>;
  onReport: (topicId: string, reason: string) => Promise<void>;
  onBlockAuthor: (authorId: string) => Promise<void>;
  focusedTopicId: string | null;
  onFocusHandled: () => void;
};

export function ForumScreen({ topics, hideSpoilers, onCreate, onLoadReplies, onSubscribeReplies, onReply, onUpdateReply, onDeleteReply, onLike, onAcceptReply, onUpdate, onDelete, onReport, onBlockAuthor, focusedTopicId, onFocusHandled }: ForumScreenProps) {
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const [kind, setKind] = useState<'discussion' | 'identify'>('discussion');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<ForumTopic | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [replySpoiler, setReplySpoiler] = useState(false);
  const [replyBusy, setReplyBusy] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [likedTopics, setLikedTopics] = useState<string[]>([]);
  const [revealedReplies, setRevealedReplies] = useState<string[]>([]);
  const [actionMode, setActionMode] = useState<'edit' | 'report' | null>(null);
  const [actionTitle, setActionTitle] = useState('');
  const [actionBody, setActionBody] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [editingReply, setEditingReply] = useState<ForumReply | null>(null);
  const [editingReplyBody, setEditingReplyBody] = useState('');
  const [editingReplySpoiler, setEditingReplySpoiler] = useState(false);
  const loadRepliesRef = useRef(onLoadReplies);
  const subscribeRepliesRef = useRef(onSubscribeReplies);
  const visible = topics.filter((topic) => topic.kind === kind && `${topic.title} ${topic.body}`.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    loadRepliesRef.current = onLoadReplies;
    subscribeRepliesRef.current = onSubscribeReplies;
  }, [onLoadReplies, onSubscribeReplies]);

  useEffect(() => {
    if (!focusedTopicId) return;
    const focused = topics.find((topic) => topic.id === focusedTopicId);
    if (focused) {
      setKind(focused.kind);
      setSearch('');
      setSelectedTopic(focused);
    }
    onFocusHandled();
  }, [focusedTopicId, onFocusHandled, topics]);

  useEffect(() => {
    if (!selectedTopic) { setReplies([]); return; }
    let active = true;
    setReplyError('');
    void loadRepliesRef.current(selectedTopic.id)
      .then((items) => { if (active) setReplies(items); })
      .catch((error: unknown) => { if (active) setReplyError(error instanceof Error ? error.message : 'No se pudieron cargar las respuestas.'); });
    const unsubscribe = subscribeRepliesRef.current(selectedTopic.id, (items) => { if (active) setReplies(items); });
    return () => { active = false; unsubscribe(); };
  }, [selectedTopic?.id]);

  const create = async () => {
    if (title.trim().length < 5 || body.trim().length < 10) return;
    if (createBusy) return;
    setCreateBusy(true); setCreateError('');
    try {
      await onCreate({ id: `topic-${Date.now()}`, kind, title: title.trim(), body: body.trim(), author: 'Tú', initials: 'TÚ', time: 'Ahora', tags: [kind === 'identify' ? 'Ayúdame a encontrarla' : 'Nuevo debate'], replies: 0, likes: 0, solved: false });
      setTitle(''); setBody(''); setCreateOpen(false);
    } catch (error) { setCreateError(error instanceof Error ? error.message : 'No se pudo publicar.'); }
    finally { setCreateBusy(false); }
  };

  const sendReply = () => {
    if (!selectedTopic || replyText.trim().length < 2 || replyBusy) return;
    setReplyBusy(true);
    setReplyError('');
    void onReply(selectedTopic.id, replyText, replySpoiler)
      .then((reply) => { setReplies((current) => [...current, reply]); setReplyText(''); setReplySpoiler(false); })
      .catch((error: unknown) => setReplyError(error instanceof Error ? error.message : 'No se pudo publicar la respuesta.'))
      .finally(() => setReplyBusy(false));
  };

  const toggleLike = (topicId: string) => {
    const liked = !likedTopics.includes(topicId);
    setLikedTopics((current) => liked ? [...current, topicId] : current.filter((id) => id !== topicId));
    void onLike(topicId, liked).catch((error: unknown) => setReplyError(error instanceof Error ? error.message : 'No se pudo actualizar el like.'));
  };

  const openAction = (mode: 'edit' | 'report') => {
    if (!selectedTopic) return;
    setActionMode(mode);
    setActionTitle(mode === 'edit' ? selectedTopic.title : '');
    setActionBody(mode === 'edit' ? selectedTopic.body : '');
    setActionMessage('');
  };

  const submitAction = async () => {
    if (!selectedTopic || actionBusy) return;
    setActionBusy(true);
    setActionMessage('');
    try {
      if (actionMode === 'edit') {
        await onUpdate(selectedTopic.id, actionTitle, actionBody);
        setSelectedTopic({ ...selectedTopic, title: actionTitle.trim(), body: actionBody.trim() });
      } else if (actionMode === 'report') {
        await onReport(selectedTopic.id, actionBody);
        Alert.alert('Reporte enviado', 'La publicación quedó en la cola de moderación.');
      }
      setActionMode(null);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'No se pudo completar la acción.');
    } finally {
      setActionBusy(false);
    }
  };

  const confirmDelete = () => {
    if (!selectedTopic) return;
    Alert.alert('Eliminar publicación', 'La publicación dejará de estar visible. Esta acción no se puede deshacer desde la aplicación.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { void onDelete(selectedTopic.id).then(() => setSelectedTopic(null)).catch((error: unknown) => setReplyError(error instanceof Error ? error.message : 'No se pudo eliminar.')); } },
    ]);
  };

  const confirmBlock = () => {
    if (!selectedTopic?.authorId) return;
    Alert.alert('Bloquear usuario', `Dejarás de ver publicaciones de ${selectedTopic.author}.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Bloquear', style: 'destructive', onPress: () => { void onBlockAuthor(selectedTopic.authorId!).then(() => setSelectedTopic(null)).catch((error: unknown) => setReplyError(error instanceof Error ? error.message : 'No se pudo bloquear.')); } },
    ]);
  };

  const saveReplyEdit = async () => {
    if (!editingReply || actionBusy || editingReplyBody.trim().length < 2) return;
    setActionBusy(true); setActionMessage('');
    try {
      await onUpdateReply(editingReply.id, editingReplyBody, editingReplySpoiler);
      setReplies((current) => current.map((reply) => reply.id === editingReply.id ? { ...reply, body: editingReplyBody.trim(), containsSpoilers: editingReplySpoiler } : reply));
      setEditingReply(null);
    } catch (error) { setActionMessage(error instanceof Error ? error.message : 'No se pudo editar la respuesta.'); }
    finally { setActionBusy(false); }
  };

  const confirmDeleteReply = (reply: ForumReply) => {
    Alert.alert('Eliminar respuesta', 'La respuesta dejará de estar visible.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { void onDeleteReply(reply.id).then(() => setReplies((current) => current.filter((item) => item.id !== reply.id))).catch((error: unknown) => setReplyError(error instanceof Error ? error.message : 'No se pudo eliminar.')); } },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <View style={[styles.forumTitleRow, compact && styles.forumTitleRowCompact]}><PageTitle eyebrow="LA CONVERSACIÓN SIGUE" title="Foros de la comunidad" description="Debate escenas, comparte teorías o encuentra esa historia que sólo recuerdas a medias." /><Button label="Nueva publicación" icon="plus" onPress={() => setCreateOpen(true)} style={compact ? styles.forumCreateMobile : undefined} /></View>
      <View style={styles.forumToolbar}>
        <View style={styles.forumTabs}>
          <Pressable onPress={() => setKind('discussion')} style={[styles.forumTab, kind === 'discussion' && styles.forumTabActive]}><Feather name="message-square" size={17} color={kind === 'discussion' ? colors.ink : colors.textMuted} /><Text style={[styles.forumTabText, kind === 'discussion' && styles.forumTabTextActive]}>Debates</Text></Pressable>
          <Pressable onPress={() => setKind('identify')} style={[styles.forumTab, kind === 'identify' && styles.forumTabActive]}><Feather name="search" size={17} color={kind === 'identify' ? colors.ink : colors.textMuted} /><Text style={[styles.forumTabText, kind === 'identify' && styles.forumTabTextActive]}>¿Qué película era?</Text></Pressable>
        </View>
        <View style={styles.searchBox}><Feather name="search" size={17} color={colors.textDim} /><TextInput value={search} onChangeText={setSearch} placeholder="Buscar conversaciones" placeholderTextColor={colors.textDim} style={styles.searchInput} /></View>
      </View>
      {kind === 'identify' && <View style={styles.identifyInfo}><View style={styles.identifyIcon}><Feather name="help-circle" size={21} color={colors.blue} /></View><View style={styles.identifyCopy}><Text style={styles.identifyTitle}>Cuantos más detalles, mejor</Text><Text style={styles.identifyText}>Describe escenas, época aproximada, idioma, actores, animación o dónde la viste. La comunidad puede marcar la respuesta correcta.</Text></View></View>}
      <View style={styles.topicGrid}>{visible.map((topic) => <TopicCard key={topic.id} topic={topic} highlighted={topic.id === focusedTopicId} onOpen={() => setSelectedTopic(topic)} />)}</View>
      {!visible.length && <View style={styles.emptyState}><Feather name="search" size={30} color={colors.textDim} /><Text style={styles.emptyTitle}>No encontramos conversaciones</Text><Text style={styles.emptyText}>Prueba con otras palabras o crea la primera publicación.</Text></View>}

      <Modal transparent visible={createOpen} animationType="fade" onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.modalBackdrop}><View style={styles.composeModal}>
          <View style={styles.modalHeader}><View><Text style={styles.modalEyebrow}>{kind === 'identify' ? 'AYUDA DE LA COMUNIDAD' : 'NUEVO DEBATE'}</Text><Text style={styles.modalTitle}>{kind === 'identify' ? '¿Qué película o serie era?' : 'Inicia una conversación'}</Text></View><IconButton icon="x" label="Cerrar" onPress={() => setCreateOpen(false)} /></View>
          <Text style={styles.inputLabel}>Título</Text><TextInput value={title} onChangeText={setTitle} maxLength={100} placeholder={kind === 'identify' ? 'Ej. Película sobre una estación que aparecía de noche' : 'Una pregunta clara atrae mejores respuestas'} placeholderTextColor={colors.textDim} style={styles.modalInput} />
          <Text style={styles.inputLabel}>Detalles</Text><TextInput value={body} onChangeText={setBody} multiline maxLength={800} placeholder="Comparte lo que recuerdas, tu teoría o el contexto de la conversación…" placeholderTextColor={colors.textDim} style={[styles.modalInput, styles.modalTextarea]} />
          <View style={styles.composeTips}><Feather name="shield" size={15} color={colors.success} /><Text style={styles.composeTipsText}>Marca los spoilers y conversa sin ataques personales. Tus publicaciones son visibles para la comunidad.</Text></View>
          {!!createError && <Text accessibilityRole="alert" style={{ color: colors.coral }}>{createError}</Text>}
          <View style={styles.modalActions}><Button label="Cancelar" variant="ghost" disabled={createBusy} onPress={() => setCreateOpen(false)} style={styles.modalAction} /><Button label={createBusy ? 'Publicando…' : 'Publicar'} icon="send" disabled={createBusy || title.trim().length < 5 || body.trim().length < 10} onPress={() => { void create(); }} style={styles.modalAction} /></View>
        </View></View>
      </Modal>

      <Modal transparent visible={!!selectedTopic} animationType="fade" onRequestClose={() => setSelectedTopic(null)}>
        <View style={styles.modalBackdrop}><View style={styles.composeModal}>
          {selectedTopic && <><View style={styles.modalHeader}><View style={styles.topicDetailHeading}><Text style={styles.modalEyebrow}>{selectedTopic.kind === 'identify' ? 'AYÚDAME A ENCONTRARLA' : 'DEBATE DE LA COMUNIDAD'}</Text><Text style={styles.modalTitle}>{selectedTopic.title}</Text></View><IconButton icon="x" label="Cerrar conversación" onPress={() => { setActionMode(null); setSelectedTopic(null); }} /></View><ScrollView showsVerticalScrollIndicator={false}><View style={styles.topicDetailAuthor}><Avatar initials={selectedTopic.initials} size={42} color={selectedTopic.kind === 'identify' ? '#457B9D' : '#6B5CA5'} /><View><Text style={styles.topicAuthorName}>{selectedTopic.author}</Text><Text style={styles.topicTime}>{selectedTopic.time}</Text></View></View><Text style={styles.topicDetailBody}>{selectedTopic.body}</Text><View style={styles.topicTags}>{selectedTopic.tags.map((tag) => <Pill key={tag} label={tag} />)}</View><View style={styles.topicManagement}>{selectedTopic.isOwn ? <><Button label="Editar" icon="edit-2" compact variant="secondary" onPress={() => openAction('edit')} /><Button label="Eliminar" icon="trash-2" compact variant="ghost" onPress={confirmDelete} /></> : <><Button label="Reportar" icon="flag" compact variant="ghost" onPress={() => openAction('report')} />{!!selectedTopic.authorId && <Button label="Bloquear usuario" icon="slash" compact variant="ghost" onPress={confirmBlock} />}</>}</View><View style={styles.topicDetailStats}><View style={styles.topicMetric}><Feather name="message-circle" size={15} color={colors.lime} /><Text style={styles.topicMetricText}>{replies.length} respuestas</Text></View><Pressable onPress={() => toggleLike(selectedTopic.id)} style={styles.topicMetric}><Feather name="heart" size={15} color={likedTopics.includes(selectedTopic.id) ? colors.coral : colors.textMuted} /><Text style={styles.topicMetricText}>{likedTopics.includes(selectedTopic.id) ? 'Te gusta' : 'Dar like'}</Text></Pressable></View>
          {replies.map((reply) => <View key={reply.id} style={styles.topicDetailReply}><Text style={styles.topicDetailReplyLabel}>{reply.author} · {reply.time}</Text>{reply.containsSpoilers && hideSpoilers && !revealedReplies.includes(reply.id) ? <Pressable onPress={() => setRevealedReplies((current) => [...current, reply.id])}><Text style={styles.topicDetailReplyText}>⚠ Respuesta con spoilers · Toca para revelar</Text></Pressable> : <Text style={styles.topicDetailReplyText}>{reply.body}</Text>}{reply.isOwn && <View style={styles.topicManagement}><Button label="Editar respuesta" icon="edit-2" compact variant="ghost" onPress={() => { setEditingReply(reply); setEditingReplyBody(reply.body); setEditingReplySpoiler(reply.containsSpoilers); setActionMessage(''); }} /><Button label="Eliminar respuesta" icon="trash-2" compact variant="ghost" onPress={() => confirmDeleteReply(reply)} /></View>}{selectedTopic.isOwn && selectedTopic.kind === 'identify' && !selectedTopic.solved && !reply.isOwn && <Button label="Marcar como respuesta correcta" icon="check-circle" compact variant="ghost" onPress={() => { void onAcceptReply(selectedTopic.id, reply.id).then(() => setSelectedTopic({ ...selectedTopic, solved: true })).catch((error: unknown) => setReplyError(error instanceof Error ? error.message : 'No se pudo aceptar la respuesta.')); }} />}</View>)}
          {!replies.length && <Text style={styles.emptyText}>Todavía no hay respuestas. Sé la primera persona en participar.</Text>}
          <Text style={styles.inputLabel}>Tu respuesta</Text><TextInput value={replyText} onChangeText={setReplyText} multiline maxLength={6000} placeholder="Escribe una respuesta…" placeholderTextColor={colors.textDim} style={[styles.modalInput, styles.modalTextareaSmall]} />
          <Pressable onPress={() => setReplySpoiler((current) => !current)} style={styles.topicMetric}><Feather name={replySpoiler ? 'check-square' : 'square'} size={17} color={replySpoiler ? colors.lime : colors.textMuted} /><Text style={styles.topicMetricText}>Contiene spoilers</Text></Pressable>
          {!!replyError && <Text style={{ color: colors.coral }}>{replyError}</Text>}<Button label={replyBusy ? 'Publicando…' : 'Responder en la conversación'} icon="message-square" disabled={replyBusy || replyText.trim().length < 2} onPress={sendReply} style={styles.topicReplyButton} /></ScrollView></>}
        </View></View>
      </Modal>

      <Modal transparent visible={actionMode !== null} animationType="fade" onRequestClose={() => setActionMode(null)}>
        <View style={styles.modalBackdrop}><View style={styles.composeModal}>
          <View style={styles.modalHeader}><View><Text style={styles.modalEyebrow}>{actionMode === 'edit' ? 'EDITAR PUBLICACIÓN' : 'MODERACIÓN'}</Text><Text style={styles.modalTitle}>{actionMode === 'edit' ? 'Actualiza tu conversación' : 'Reportar publicación'}</Text></View><IconButton icon="x" label="Cerrar" onPress={() => setActionMode(null)} /></View>
          {actionMode === 'edit' && <><Text style={styles.inputLabel}>Título</Text><TextInput value={actionTitle} onChangeText={setActionTitle} maxLength={160} placeholderTextColor={colors.textDim} style={styles.modalInput} /></>}
          <Text style={styles.inputLabel}>{actionMode === 'edit' ? 'Detalles' : 'Motivo del reporte'}</Text><TextInput value={actionBody} onChangeText={setActionBody} multiline maxLength={actionMode === 'edit' ? 6000 : 500} placeholder={actionMode === 'report' ? 'Explica claramente qué regla incumple…' : undefined} placeholderTextColor={colors.textDim} style={[styles.modalInput, styles.modalTextarea]} />
          {!!actionMessage && <Text style={{ color: colors.coral }}>{actionMessage}</Text>}
          <View style={styles.modalActions}><Button label="Cancelar" variant="ghost" onPress={() => setActionMode(null)} style={styles.modalAction} /><Button label={actionBusy ? 'Guardando…' : actionMode === 'edit' ? 'Guardar cambios' : 'Enviar reporte'} icon="send" disabled={actionBusy || actionBody.trim().length < (actionMode === 'edit' ? 10 : 3) || (actionMode === 'edit' && actionTitle.trim().length < 5)} onPress={() => { void submitAction(); }} style={styles.modalAction} /></View>
        </View></View>
      </Modal>

      <Modal transparent visible={editingReply !== null} animationType="fade" onRequestClose={() => setEditingReply(null)}>
        <View style={styles.modalBackdrop}><View style={styles.composeModal}>
          <View style={styles.modalHeader}><View><Text style={styles.modalEyebrow}>TU RESPUESTA</Text><Text style={styles.modalTitle}>Editar respuesta</Text></View><IconButton icon="x" label="Cerrar" onPress={() => setEditingReply(null)} /></View>
          <TextInput value={editingReplyBody} onChangeText={setEditingReplyBody} multiline maxLength={6000} placeholderTextColor={colors.textDim} style={[styles.modalInput, styles.modalTextarea]} />
          <Pressable onPress={() => setEditingReplySpoiler((current) => !current)} style={styles.topicMetric}><Feather name={editingReplySpoiler ? 'check-square' : 'square'} size={17} color={editingReplySpoiler ? colors.lime : colors.textMuted} /><Text style={styles.topicMetricText}>Contiene spoilers</Text></Pressable>
          {!!actionMessage && <Text accessibilityRole="alert" style={{ color: colors.coral }}>{actionMessage}</Text>}
          <View style={styles.modalActions}><Button label="Cancelar" variant="ghost" disabled={actionBusy} onPress={() => setEditingReply(null)} style={styles.modalAction} /><Button label={actionBusy ? 'Guardando…' : 'Guardar respuesta'} icon="check" disabled={actionBusy || editingReplyBody.trim().length < 2} onPress={() => { void saveReplyEdit(); }} style={styles.modalAction} /></View>
        </View></View>
      </Modal>
    </ScrollView>
  );
}
