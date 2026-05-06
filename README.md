# Zahavi — Setup para Claude Code

Suite completa de configuración para desarrollar el sistema POS **Zahavi** usando Claude Code como agente principal.

## Estructura

```
zahavi-claude-code-setup/
├── CLAUDE.md                          # Instrucciones globales (Claude las lee en CADA turno)
├── PROMPTS_POR_ITERACION.md           # 8 prompts pegables, uno por fase del proyecto
├── BOOTSTRAP.md                       # Comandos iniciales de scaffolding
├── .claude/
│   ├── settings.json                  # Modelo por defecto, hooks, permisos
│   ├── agents/                        # Subagentes especializados
│   │   ├── architect-guardian.md      # Vigila la arquitectura hexagonal
│   │   ├── security-auditor.md        # Revisa secrets, SQLi, RLS, OWASP
│   │   ├── db-reviewer.md             # Revisa migraciones SQL y RLS
│   │   ├── domain-modeler.md          # Experto DDD para bounded contexts
│   │   ├── test-engineer.md           # Escribe y mantiene tests
│   │   ├── ux-ui-reviewer.md          # Accesibilidad y flujos UX
│   │   ├── code-reviewer.md           # Code review pre-commit
│   │   └── doc-writer.md              # ADRs, OpenAPI, runbooks
│   └── commands/                      # Slash commands personalizados
│       ├── verify-architecture.md
│       ├── security-scan.md
│       ├── new-bounded-context.md
│       ├── new-use-case.md
│       └── pre-commit.md
└── README.md                          # Este archivo
```

## Cómo usar

### 1) Inicializa el repo
Copia esta carpeta como base de tu repositorio Zahavi (o copia su contenido a la raíz de un repo nuevo):

```bash
cd ~/Proyectos
git init zahavi
cp -r zahavi-claude-code-setup/. zahavi/
cd zahavi
git add .
git commit -m "chore: bootstrap Claude Code setup"
```

### 2) Abre el repo con Claude Code
```bash
cd zahavi
claude
```

Claude Code leerá automáticamente `CLAUDE.md` y registrará los subagentes de `.claude/agents/`.

### 3) Pega el primer prompt iterativo
Abre `PROMPTS_POR_ITERACION.md` → copia **Iteración 0 (Bootstrap)** → pégalo en Claude Code.

Repite con cada iteración cuando la anterior esté verde (tests OK, security scan OK, code review OK).

### 4) Slash commands disponibles
- `/verify-architecture` — invoca al **architect-guardian** para auditar pureza del dominio.
- `/security-scan` — invoca al **security-auditor** para barrer secrets, SQLi, RLS.
- `/new-bounded-context <nombre>` — anda al **domain-modeler** y arranca un BC con su scaffolding.
- `/new-use-case <bc> <nombre>` — añade un caso de uso con tests al BC indicado.
- `/pre-commit` — corre la cadena completa de revisión antes de commit.

## Estrategia de tokens

| Tarea | Modelo recomendado |
|---|---|
| Decisiones arquitectónicas, ADRs, modelado de dominio | **Opus** |
| Implementación de casos de uso, code review, security review | **Sonnet** |
| Tests, formateo, búsqueda de archivos, parseo de logs, doc generada | **Haiku** |

Los subagentes ya traen el modelo configurado en su frontmatter; no necesitas elegirlo manualmente.

## Filosofía

> Calidad sobre velocidad. Seguridad sobre conveniencia. Dominio sobre framework.

Si alguna decisión compromete el aislamiento del dominio, se rechaza. Si introduce credenciales en el cliente, se rechaza. Si rompe RLS o auditoría inmutable, se rechaza.
