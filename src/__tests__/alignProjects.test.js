const {
  alignProjectsWithSkills,
  extractSkillsFromText,
} = require('../utils/api');

describe('extractSkillsFromText', () => {
  test('extracts skills from JD text', () => {
    const text = '要求熟悉 React、TypeScript、Node.js 和 Docker，有 Redis 经验';
    const skills = extractSkillsFromText(text);
    expect(skills).toEqual(
      expect.arrayContaining([
        'React',
        'TypeScript',
        'Node.js',
        'Docker',
        'Redis',
      ])
    );
  });
});

describe('alignProjectsWithSkills', () => {
  test('generates 2-3 projects with diverse names', () => {
    const result = alignProjectsWithSkills(
      [],
      ['React', 'TypeScript', 'Node.js', 'MySQL', 'Docker', 'Redis']
    );
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.length).toBeLessThanOrEqual(3);
    const names = result.map((p) => p.name);
    expect(new Set(names).size).toBeGreaterThanOrEqual(2);
  });

  test('each project has different techStack', () => {
    const result = alignProjectsWithSkills(
      [],
      ['React', 'Vue', 'Go', 'MySQL', 'Docker', 'Redis']
    );
    const stacks = result.map((p) => p.techStack.sort().join(','));
    expect(new Set(stacks).size).toBeGreaterThanOrEqual(2);
  });

  test('each project has different description', () => {
    const result = alignProjectsWithSkills(
      [],
      ['React', 'Vue', 'Go', 'MySQL', 'Docker', 'Redis']
    );
    const descs = result.map((p) => p.description);
    expect(new Set(descs).size).toBeGreaterThanOrEqual(2);
  });

  test('distributes skills across projects', () => {
    const result = alignProjectsWithSkills(
      [],
      ['React', 'Vue', 'Go', 'MySQL', 'Docker', 'Redis', 'Kafka']
    );
    const all = result.flatMap((p) => p.techStack.map((t) => t.toLowerCase()));
    expect(all).toContain('react');
    expect(all).toContain('go');
    const matched = ['react', 'vue', 'go', 'mysql', 'docker', 'redis', 'kafka'];
    expect(
      matched.filter((s) => all.includes(s)).length
    ).toBeGreaterThanOrEqual(2);
  });

  test('fallback generates projects when empty', () => {
    const result = alignProjectsWithSkills([], ['Go', 'Kafka']);
    expect(result.length).toBeGreaterThan(0);
    const allTech = result.flatMap((p) => p.techStack);
    expect(allTech.some((t) => t.toLowerCase() === 'go')).toBe(true);
  });
});
