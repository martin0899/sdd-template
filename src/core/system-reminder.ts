import { DetectedSkill } from './skill-detector';

export const SYSTEM_REMINDER_BEGIN = '<system-reminder>';
export const SYSTEM_REMINDER_END = '</system-reminder>';
export const SKILLS_MARKER_BEGIN = '<!-- BEGIN: spectralis skills -->';
export const SKILLS_MARKER_END = '<!-- END: spectralis skills -->';
export const SKILLS_HEADING = '## Skills disponibles';

export type SystemReminderStatus = 'created' | 'updated' | 'synced';

export interface SystemReminderResult {
  status: SystemReminderStatus;
  content: string;
}

/**
 * Builds the markdown skills section for the system-reminder block.
 * The trigger is appended in parentheses only when it differs from the
 * description to avoid redundant output.
 */
export function buildSkillsBlock(skills: DetectedSkill[]): string {
  const lines = skills.map((s) => {
    const trigger = s.trigger !== s.description ? ` (${s.trigger})` : '';
    return `- ${s.name}: ${s.description}${trigger}`;
  });
  return [SKILLS_HEADING, ...lines].join('\n');
}

/**
 * Updates the `<system-reminder>` block of a prompt to carry the detected
 * skills. Preserves any other content in the prompt and inside the reminder:
 * only the skills section (delimited by SKILLS_MARKER_*) is replaced.
 */
export function updateSystemReminder(
  promptContent: string,
  skills: DetectedSkill[]
): SystemReminderResult {
  const skillsSection = `${SKILLS_MARKER_BEGIN}\n${buildSkillsBlock(skills)}\n${SKILLS_MARKER_END}`;

  if (!promptContent.includes(SYSTEM_REMINDER_BEGIN)) {
    const reminder = `${SYSTEM_REMINDER_BEGIN}\n${skillsSection}\n${SYSTEM_REMINDER_END}`;
    return {
      status: 'created',
      content: `${promptContent.replace(/\n*$/, '\n')}${reminder}\n`
    };
  }

  if (promptContent.includes(SKILLS_MARKER_BEGIN)) {
    const begin = promptContent.indexOf(SKILLS_MARKER_BEGIN);
    const end = promptContent.indexOf(SKILLS_MARKER_END);
    if (end === -1 || end < begin) {
      throw new Error('Malformed skills section: SKILLS_MARKER_BEGIN without SKILLS_MARKER_END');
    }
    if (promptContent.includes(skillsSection)) {
      return { status: 'synced', content: promptContent };
    }
    const before = promptContent.slice(0, begin);
    const after = promptContent.slice(end + SKILLS_MARKER_END.length);
    return { status: 'updated', content: `${before}${skillsSection}${after}` };
  }

  const reminderBegin = promptContent.indexOf(SYSTEM_REMINDER_BEGIN) + SYSTEM_REMINDER_BEGIN.length;
  const reminderEnd = promptContent.indexOf(SYSTEM_REMINDER_END);
  if (reminderEnd === -1) {
    throw new Error('Malformed system-reminder block: no closing tag');
  }
  const head = promptContent.slice(0, reminderEnd);
  const tail = promptContent.slice(reminderEnd);
  return { status: 'updated', content: `${head.replace(/\n*$/, '\n')}${skillsSection}\n${tail}` };
}