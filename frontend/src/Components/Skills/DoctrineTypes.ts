// The backend's OpenAPI schema for CharacterDoctrines.doctrines/skills is
// under-specified (loose `{[key: string]: unknown}`), so these shapes are
// derived from how DoctrineCheck/DoctrineModal actually consume them.
export type DoctrineMetadata = {
  total_sp: number;
  trained_sp: number;
  categories?: string[];
  required_skills?: Record<string, number>;
};

export type DoctrineSkillReqs = {
  _meta: DoctrineMetadata;
  [skillName: string]: number | DoctrineMetadata;
};

export type DoctrineSkillList = {
  [skillName: string]: { active_level: number; trained_level: number };
};

// Highest skill-queue finish_level per skill name (corptools/api/schema.py
// CharacterDoctrines.queue) - same under-specified-schema situation as
// doctrines/skills above.
export type DoctrineQueue = {
  [skillName: string]: number;
};
