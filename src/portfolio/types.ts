export type AudienceId = 'executive' | 'architect' | 'sales' | 'internal'
export type Project = { id: string; title: string; category: string; kicker: string; summary: string; audience: string; built: string; workflow: string; consumed: string; reuse: string; maturity: string; source?: string; accent: string; tags: string[]; media?: { poster: string; clip?: string; label: string } }
export type Audience = { id: AudienceId; name: string; role: string; question: string; promise: string; deliverable: string; projectIds: string[] }
export type Chapter = { id: string; title: string; myth: string; label: string; note: string; narration: string }
export type StoryPackage = { id: string; title: string; author: string; role: string; statement: string; contactUrl: string; chapters: Chapter[]; audiences: Audience[]; projects: Project[] }
