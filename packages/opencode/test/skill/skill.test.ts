import { afterEach, test, expect } from "bun:test"
import { Skill } from "../../src/skill"
import { Instance } from "../../src/project/instance"
import { Log } from "../../src/util/log"
import { tmpdir } from "../fixture/fixture"
import path from "path"
import fs from "fs/promises"

afterEach(async () => {
  await Instance.disposeAll()
})

async function createGlobalSkill(homeDir: string) {
  const skillDir = path.join(homeDir, ".claude", "skills", "global-test-skill")
  await fs.mkdir(skillDir, { recursive: true })
  await Bun.write(
    path.join(skillDir, "SKILL.md"),
    `---
name: global-test-skill
description: A global skill from ~/.claude/skills for testing.
---

# Global Test Skill

This skill is loaded from the global home directory.
`,
  )
}

async function createSkill(file: string, name: string, desc: string) {
  await Bun.write(
    file,
    `---
name: ${name}
description: ${desc}
---

# ${name}
`,
  )
}

test("discovers skills from .opencode/skill/ directory", async () => {
  await using tmp = await tmpdir({
    git: true,
    init: async (dir) => {
      const skillDir = path.join(dir, ".opencode", "skill", "test-skill")
      await Bun.write(
        path.join(skillDir, "SKILL.md"),
        `---
name: test-skill
description: A test skill for verification.
---

# Test Skill

Instructions here.
`,
      )
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const skills = await Skill.all()
      expect(skills.length).toBe(1)
      const testSkill = skills.find((s) => s.name === "test-skill")
      expect(testSkill).toBeDefined()
      expect(testSkill!.description).toBe("A test skill for verification.")
      expect(testSkill!.location).toContain(path.join("skill", "test-skill", "SKILL.md"))
    },
  })
})

test("returns skill directories from Skill.dirs", async () => {
  await using tmp = await tmpdir({
    git: true,
    init: async (dir) => {
      const skillDir = path.join(dir, ".opencode", "skill", "dir-skill")
      await Bun.write(
        path.join(skillDir, "SKILL.md"),
        `---
name: dir-skill
description: Skill for dirs test.
---

# Dir Skill
`,
      )
    },
  })

  const home = process.env.OPENCODE_TEST_HOME
  process.env.OPENCODE_TEST_HOME = tmp.path

  try {
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const dirs = await Skill.dirs()
        const skillDir = path.join(tmp.path, ".opencode", "skill", "dir-skill")
        expect(dirs).toContain(skillDir)
        expect(dirs.length).toBe(1)
      },
    })
  } finally {
    process.env.OPENCODE_TEST_HOME = home
  }
})

test("discovers multiple skills from .opencode/skill/ directory", async () => {
  await using tmp = await tmpdir({
    git: true,
    init: async (dir) => {
      const skillDir1 = path.join(dir, ".opencode", "skill", "skill-one")
      const skillDir2 = path.join(dir, ".opencode", "skill", "skill-two")
      await Bun.write(
        path.join(skillDir1, "SKILL.md"),
        `---
name: skill-one
description: First test skill.
---

# Skill One
`,
      )
      await Bun.write(
        path.join(skillDir2, "SKILL.md"),
        `---
name: skill-two
description: Second test skill.
---

# Skill Two
`,
      )
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const skills = await Skill.all()
      expect(skills.length).toBe(2)
      expect(skills.find((s) => s.name === "skill-one")).toBeDefined()
      expect(skills.find((s) => s.name === "skill-two")).toBeDefined()
    },
  })
})

test("skips skills with missing frontmatter", async () => {
  await using tmp = await tmpdir({
    git: true,
    init: async (dir) => {
      const skillDir = path.join(dir, ".opencode", "skill", "no-frontmatter")
      await Bun.write(
        path.join(skillDir, "SKILL.md"),
        `# No Frontmatter

Just some content without YAML frontmatter.
`,
      )
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const skills = await Skill.all()
      expect(skills).toEqual([])
    },
  })
})

test("discovers skills from .claude/skills/ directory", async () => {
  await using tmp = await tmpdir({
    git: true,
    init: async (dir) => {
      const skillDir = path.join(dir, ".claude", "skills", "claude-skill")
      await Bun.write(
        path.join(skillDir, "SKILL.md"),
        `---
name: claude-skill
description: A skill in the .claude/skills directory.
---

# Claude Skill
`,
      )
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const skills = await Skill.all()
      expect(skills.length).toBe(1)
      const claudeSkill = skills.find((s) => s.name === "claude-skill")
      expect(claudeSkill).toBeDefined()
      expect(claudeSkill!.location).toContain(path.join(".claude", "skills", "claude-skill", "SKILL.md"))
    },
  })
})

test("discovers global skills from ~/.claude/skills/ directory", async () => {
  await using tmp = await tmpdir({ git: true })

  const originalHome = process.env.OPENCODE_TEST_HOME
  process.env.OPENCODE_TEST_HOME = tmp.path

  try {
    await createGlobalSkill(tmp.path)
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const skills = await Skill.all()
        expect(skills.length).toBe(1)
        expect(skills[0].name).toBe("global-test-skill")
        expect(skills[0].description).toBe("A global skill from ~/.claude/skills for testing.")
        expect(skills[0].location).toContain(path.join(".claude", "skills", "global-test-skill", "SKILL.md"))
      },
    })
  } finally {
    process.env.OPENCODE_TEST_HOME = originalHome
  }
})

test("returns empty array when no skills exist", async () => {
  await using tmp = await tmpdir({ git: true })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const skills = await Skill.all()
      expect(skills).toEqual([])
    },
  })
})

test("discovers skills from .agents/skills/ directory", async () => {
  await using tmp = await tmpdir({
    git: true,
    init: async (dir) => {
      const skillDir = path.join(dir, ".agents", "skills", "agent-skill")
      await Bun.write(
        path.join(skillDir, "SKILL.md"),
        `---
name: agent-skill
description: A skill in the .agents/skills directory.
---

# Agent Skill
`,
      )
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const skills = await Skill.all()
      expect(skills.length).toBe(1)
      const agentSkill = skills.find((s) => s.name === "agent-skill")
      expect(agentSkill).toBeDefined()
      expect(agentSkill!.location).toContain(path.join(".agents", "skills", "agent-skill", "SKILL.md"))
    },
  })
})

test("discovers global skills from ~/.agents/skills/ directory", async () => {
  await using tmp = await tmpdir({ git: true })

  const originalHome = process.env.OPENCODE_TEST_HOME
  process.env.OPENCODE_TEST_HOME = tmp.path

  try {
    const skillDir = path.join(tmp.path, ".agents", "skills", "global-agent-skill")
    await fs.mkdir(skillDir, { recursive: true })
    await Bun.write(
      path.join(skillDir, "SKILL.md"),
      `---
name: global-agent-skill
description: A global skill from ~/.agents/skills for testing.
---

# Global Agent Skill

This skill is loaded from the global home directory.
`,
    )

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const skills = await Skill.all()
        expect(skills.length).toBe(1)
        expect(skills[0].name).toBe("global-agent-skill")
        expect(skills[0].description).toBe("A global skill from ~/.agents/skills for testing.")
        expect(skills[0].location).toContain(path.join(".agents", "skills", "global-agent-skill", "SKILL.md"))
      },
    })
  } finally {
    process.env.OPENCODE_TEST_HOME = originalHome
  }
})

test("discovers skills from both .claude/skills/ and .agents/skills/", async () => {
  await using tmp = await tmpdir({
    git: true,
    init: async (dir) => {
      const claudeDir = path.join(dir, ".claude", "skills", "claude-skill")
      const agentDir = path.join(dir, ".agents", "skills", "agent-skill")
      await Bun.write(
        path.join(claudeDir, "SKILL.md"),
        `---
name: claude-skill
description: A skill in the .claude/skills directory.
---

# Claude Skill
`,
      )
      await Bun.write(
        path.join(agentDir, "SKILL.md"),
        `---
name: agent-skill
description: A skill in the .agents/skills directory.
---

# Agent Skill
`,
      )
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const skills = await Skill.all()
      expect(skills.length).toBe(2)
      expect(skills.find((s) => s.name === "claude-skill")).toBeDefined()
      expect(skills.find((s) => s.name === "agent-skill")).toBeDefined()
    },
  })
})

test("duplicate skill: .agents overrides .claude", async () => {
  await using tmp = await tmpdir({
    git: true,
    init: async (dir) => {
      await createSkill(path.join(dir, ".claude", "skills", "dup", "SKILL.md"), "dup", "from-claude")
      await createSkill(path.join(dir, ".agents", "skills", "dup", "SKILL.md"), "dup", "from-agents")
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const skill = await Skill.get("dup")
      expect(skill?.description).toBe("from-agents")
      expect(skill?.location).toContain(path.join(".agents", "skills", "dup", "SKILL.md"))
    },
  })
})

test("duplicate skill: .opencode overrides .agents", async () => {
  await using tmp = await tmpdir({
    git: true,
    init: async (dir) => {
      await createSkill(path.join(dir, ".agents", "skills", "dup", "SKILL.md"), "dup", "from-agents")
      await createSkill(path.join(dir, ".opencode", "skills", "dup", "SKILL.md"), "dup", "from-opencode")
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const skill = await Skill.get("dup")
      expect(skill?.description).toBe("from-opencode")
      expect(skill?.location).toContain(path.join(".opencode", "skills", "dup", "SKILL.md"))
    },
  })
})

test("duplicate skill: .opencode overrides .claude", async () => {
  await using tmp = await tmpdir({
    git: true,
    init: async (dir) => {
      await createSkill(path.join(dir, ".claude", "skills", "dup", "SKILL.md"), "dup", "from-claude")
      await createSkill(path.join(dir, ".opencode", "skills", "dup", "SKILL.md"), "dup", "from-opencode")
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const skill = await Skill.get("dup")
      expect(skill?.description).toBe("from-opencode")
      expect(skill?.location).toContain(path.join(".opencode", "skills", "dup", "SKILL.md"))
    },
  })
})

test("duplicate skill: .opencode/skills overrides .opencode/skill", async () => {
  await using tmp = await tmpdir({
    git: true,
    init: async (dir) => {
      await createSkill(path.join(dir, ".opencode", "skill", "dup", "SKILL.md"), "dup", "from-singular")
      await createSkill(path.join(dir, ".opencode", "skills", "dup", "SKILL.md"), "dup", "from-plural")
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const skill = await Skill.get("dup")
      expect(skill?.description).toBe("from-plural")
      expect(skill?.location).toContain(path.join(".opencode", "skills", "dup", "SKILL.md"))
    },
  })
})

test("duplicate skill: project .claude overrides global .claude", async () => {
  await using tmp = await tmpdir({
    git: true,
    init: async (dir) => {
      const home = path.join(dir, "home")
      await createSkill(path.join(home, ".claude", "skills", "dup", "SKILL.md"), "dup", "from-global")
      await createSkill(path.join(dir, ".claude", "skills", "dup", "SKILL.md"), "dup", "from-project")
    },
  })

  const prev = process.env.OPENCODE_TEST_HOME
  process.env.OPENCODE_TEST_HOME = path.join(tmp.path, "home")
  try {
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const skill = await Skill.get("dup")
        expect(skill?.description).toBe("from-project")
        expect(skill?.location).toContain(path.join(tmp.path, ".claude", "skills", "dup", "SKILL.md"))
      },
    })
  } finally {
    if (prev === undefined) delete process.env.OPENCODE_TEST_HOME
    else process.env.OPENCODE_TEST_HOME = prev
  }
})

test("duplicate skill: project .agents overrides global .agents", async () => {
  await using tmp = await tmpdir({
    git: true,
    init: async (dir) => {
      const home = path.join(dir, "home")
      await createSkill(path.join(home, ".agents", "skills", "dup", "SKILL.md"), "dup", "from-global")
      await createSkill(path.join(dir, ".agents", "skills", "dup", "SKILL.md"), "dup", "from-project")
    },
  })

  const prev = process.env.OPENCODE_TEST_HOME
  process.env.OPENCODE_TEST_HOME = path.join(tmp.path, "home")
  try {
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const skill = await Skill.get("dup")
        expect(skill?.description).toBe("from-project")
        expect(skill?.location).toContain(path.join(tmp.path, ".agents", "skills", "dup", "SKILL.md"))
      },
    })
  } finally {
    if (prev === undefined) delete process.env.OPENCODE_TEST_HOME
    else process.env.OPENCODE_TEST_HOME = prev
  }
})

test("duplicate skill: OPENCODE_CONFIG_DIR overrides .opencode", async () => {
  await using tmp = await tmpdir({
    git: true,
    init: async (dir) => {
      const cfg = path.join(dir, "cfg")
      await createSkill(path.join(dir, ".opencode", "skills", "dup", "SKILL.md"), "dup", "from-opencode")
      await createSkill(path.join(cfg, "skills", "dup", "SKILL.md"), "dup", "from-config-dir")
    },
  })

  const prev = process.env.OPENCODE_CONFIG_DIR
  process.env.OPENCODE_CONFIG_DIR = path.join(tmp.path, "cfg")
  try {
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const skill = await Skill.get("dup")
        expect(skill?.description).toBe("from-config-dir")
        expect(skill?.location).toContain(path.join(tmp.path, "cfg", "skills", "dup", "SKILL.md"))
      },
    })
  } finally {
    if (prev === undefined) delete process.env.OPENCODE_CONFIG_DIR
    else process.env.OPENCODE_CONFIG_DIR = prev
  }
})

test("duplicate skill: skills.paths overrides config directories", async () => {
  await using tmp = await tmpdir({
    git: true,
    init: async (dir) => {
      await Bun.write(
        path.join(dir, "opencode.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
          skills: {
            paths: ["./extra-skills"],
          },
        }),
      )
      await createSkill(path.join(dir, ".opencode", "skills", "dup", "SKILL.md"), "dup", "from-opencode")
      await createSkill(path.join(dir, "extra-skills", "dup", "SKILL.md"), "dup", "from-path")
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const skill = await Skill.get("dup")
      expect(skill?.description).toBe("from-path")
      expect(skill?.location).toContain(path.join("extra-skills", "dup", "SKILL.md"))
    },
  })
})

test("duplicate skill logs warning", async () => {
  await using tmp = await tmpdir({
    git: true,
    init: async (dir) => {
      await createSkill(path.join(dir, ".claude", "skills", "dup", "SKILL.md"), "dup", "from-claude")
      await createSkill(path.join(dir, ".agents", "skills", "dup", "SKILL.md"), "dup", "from-agents")
      await createSkill(path.join(dir, ".opencode", "skills", "dup", "SKILL.md"), "dup", "from-opencode")
    },
  })

  const file = Log.file()
  const prev = await fs.readFile(file, "utf8").catch(() => "")

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const skill = await Skill.get("dup")
      expect(skill?.description).toBe("from-opencode")
    },
  })

  await Bun.sleep(20)
  const next = await fs.readFile(file, "utf8").catch(() => "")
  const tail = next.slice(prev.length)
  expect(tail).toContain("duplicate skill name")
  expect(tail).toContain("shadowed=")
  expect(tail).toContain("active=")
  expect(tail).toContain(path.join(".claude", "skills", "dup", "SKILL.md"))
  expect(tail).toContain(path.join(".agents", "skills", "dup", "SKILL.md"))
  expect(tail).toContain(path.join(".opencode", "skills", "dup", "SKILL.md"))
})

test("properly resolves directories that skills live in", async () => {
  await using tmp = await tmpdir({
    git: true,
    init: async (dir) => {
      const opencodeSkillDir = path.join(dir, ".opencode", "skill", "agent-skill")
      const opencodeSkillsDir = path.join(dir, ".opencode", "skills", "agent-skill")
      const claudeDir = path.join(dir, ".claude", "skills", "claude-skill")
      const agentDir = path.join(dir, ".agents", "skills", "agent-skill")
      await Bun.write(
        path.join(claudeDir, "SKILL.md"),
        `---
name: claude-skill
description: A skill in the .claude/skills directory.
---

# Claude Skill
`,
      )
      await Bun.write(
        path.join(agentDir, "SKILL.md"),
        `---
name: agent-skill
description: A skill in the .agents/skills directory.
---

# Agent Skill
`,
      )
      await Bun.write(
        path.join(opencodeSkillDir, "SKILL.md"),
        `---
name: opencode-skill
description: A skill in the .opencode/skill directory.
---

# OpenCode Skill
`,
      )
      await Bun.write(
        path.join(opencodeSkillsDir, "SKILL.md"),
        `---
name: opencode-skill
description: A skill in the .opencode/skills directory.
---

# OpenCode Skill
`,
      )
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const dirs = await Skill.dirs()
      expect(dirs.length).toBe(4)
    },
  })
})
