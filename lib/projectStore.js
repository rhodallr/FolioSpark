// Storage layer: guest drafts live in localStorage, account drafts in Supabase.

import { supabase } from './supabaseClient';
import { emptyProject, normaliseProject } from './caseStudy';

export const GUEST_ID = 'guest';
const GUEST_KEY = 'foliospark:guest-draft';

const COLUMNS = 'id, user_id, title, target_roles, status, completion, onboarding, content, chat, flow, created_at, updated_at';

function toRow(project) {
  return {
    title: project.title || 'Untitled case study',
    target_roles: project.target_roles || [],
    status: project.status || 'draft',
    completion: project.completion || 0,
    onboarding: project.onboarding,
    content: project.content,
    chat: project.chat,
    flow: project.flow,
  };
}

// ---------- Guest ----------

export function loadGuestProject() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(GUEST_KEY);
    return raw ? normaliseProject(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveGuestProject(project) {
  try {
    window.localStorage.setItem(
      GUEST_KEY,
      JSON.stringify({ ...project, id: GUEST_ID, updated_at: new Date().toISOString() })
    );
    return true;
  } catch {
    return false;
  }
}

export function clearGuestProject() {
  try {
    window.localStorage.removeItem(GUEST_KEY);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}

// ---------- Account ----------

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured. Add your keys to .env.local.');
  return supabase;
}

export async function listProjects() {
  const { data, error } = await requireClient()
    .from('projects')
    .select('id, title, target_roles, status, completion, updated_at, created_at')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getProject(id) {
  const { data, error } = await requireClient().from('projects').select(COLUMNS).eq('id', id).single();
  if (error) throw error;
  return normaliseProject(data);
}

export async function createProject(userId, seed) {
  const project = seed ? normaliseProject(seed) : emptyProject();
  const { data, error } = await requireClient()
    .from('projects')
    .insert({ ...toRow(project), user_id: userId })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return normaliseProject(data);
}

export async function updateProject(id, project) {
  const { error } = await requireClient().from('projects').update(toRow(project)).eq('id', id);
  if (error) throw error;
}

export async function deleteProject(id) {
  const { error } = await requireClient().from('projects').delete().eq('id', id);
  if (error) throw error;
}

export async function cloneProject(userId, id) {
  const original = await getProject(id);
  return createProject(userId, { ...original, title: `${original.title} (copy)` });
}

// ---------- Unified ----------

export async function loadProject(id) {
  if (id === GUEST_ID) return loadGuestProject() || emptyProject();
  return getProject(id);
}

export async function saveProject(id, project) {
  if (id === GUEST_ID) {
    if (!saveGuestProject(project)) throw new Error('Could not save to this browser.');
    return;
  }
  await updateProject(id, project);
}
