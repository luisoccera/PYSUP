import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ForumTopic } from '../../models/types';
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

export function ForumScreen({ topics, onCreate, focusedTopicId, onFocusHandled }: { topics: ForumTopic[]; onCreate: (topic: ForumTopic) => void; focusedTopicId: string | null; onFocusHandled: () => void }) {
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const [kind, setKind] = useState<'discussion' | 'identify'>('discussion');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<ForumTopic | null>(null);
  const visible = topics.filter((topic) => topic.kind === kind && `${topic.title} ${topic.body}`.toLowerCase().includes(search.toLowerCase()));

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

  const create = () => {
    if (title.trim().length < 5 || body.trim().length < 10) return;
    onCreate({ id: `topic-${Date.now()}`, kind, title: title.trim(), body: body.trim(), author: 'Luis O.', initials: 'LO', time: 'Ahora', tags: [kind === 'identify' ? 'Ayúdame a encontrarla' : 'Nuevo debate'], replies: 0, likes: 0, solved: false });
    setTitle(''); setBody(''); setCreateOpen(false);
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
          <View style={styles.modalActions}><Button label="Cancelar" variant="ghost" onPress={() => setCreateOpen(false)} style={styles.modalAction} /><Button label="Publicar" icon="send" disabled={title.trim().length < 5 || body.trim().length < 10} onPress={create} style={styles.modalAction} /></View>
        </View></View>
      </Modal>

      <Modal transparent visible={!!selectedTopic} animationType="fade" onRequestClose={() => setSelectedTopic(null)}>
        <View style={styles.modalBackdrop}><View style={styles.composeModal}>
          {selectedTopic && <><View style={styles.modalHeader}><View style={styles.topicDetailHeading}><Text style={styles.modalEyebrow}>{selectedTopic.kind === 'identify' ? 'AYÚDAME A ENCONTRARLA' : 'DEBATE DE LA COMUNIDAD'}</Text><Text style={styles.modalTitle}>{selectedTopic.title}</Text></View><IconButton icon="x" label="Cerrar conversación" onPress={() => setSelectedTopic(null)} /></View><ScrollView showsVerticalScrollIndicator={false}><View style={styles.topicDetailAuthor}><Avatar initials={selectedTopic.initials} size={42} color={selectedTopic.kind === 'identify' ? '#457B9D' : '#6B5CA5'} /><View><Text style={styles.topicAuthorName}>{selectedTopic.author}</Text><Text style={styles.topicTime}>{selectedTopic.time}</Text></View></View><Text style={styles.topicDetailBody}>{selectedTopic.body}</Text><View style={styles.topicTags}>{selectedTopic.tags.map((tag) => <Pill key={tag} label={tag} />)}</View><View style={styles.topicDetailStats}><View style={styles.topicMetric}><Feather name="message-circle" size={15} color={colors.lime} /><Text style={styles.topicMetricText}>{selectedTopic.replies} respuestas</Text></View><View style={styles.topicMetric}><Feather name="heart" size={15} color={colors.coral} /><Text style={styles.topicMetricText}>{selectedTopic.likes} reacciones</Text></View></View><View style={styles.topicDetailReply}><Text style={styles.topicDetailReplyLabel}>RESPUESTA RECIENTE</Text><Text style={styles.topicDetailReplyText}>También me fijé en ese detalle. La escena anterior cambia ligeramente y parece confirmar que no es un error de continuidad.</Text><Text style={styles.topicDetailReplyAuthor}>Sofía R. · Hace 6 min</Text></View><Button label="Responder en la conversación" icon="message-square" onPress={() => {}} style={styles.topicReplyButton} /></ScrollView></>}
        </View></View>
      </Modal>
    </ScrollView>
  );
}
