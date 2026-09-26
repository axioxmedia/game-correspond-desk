# Correspond Desk JSON v2

Minimum valid file

```json
{
  "schemaVersion": 2,
  "id": "project-slug",
  "projectName": "项目名",
  "projectNameZh": "项目名",
  "projectNameEn": "Project name",
  "axis": "system",
  "cameras": {
    "system": { "x": 40, "y": 24, "scale": 1 },
    "discipline": { "x": 40, "y": 24, "scale": 1 }
  },
  "axes": [
    {
      "id": "system",
      "titleZh": "系统视图",
      "titleEn": "Systems",
      "tree": [
        {
          "id": "sys-combat",
          "titleZh": "战斗",
          "titleEn": "Combat",
          "color": "#ff8b8b",
          "children": [{ "id": "sys-skill", "titleZh": "技能", "titleEn": "Skills" }]
        }
      ]
    },
    {
      "id": "discipline",
      "titleZh": "工种视图",
      "titleEn": "Disciplines",
      "tree": [
        { "id": "dis-ui", "titleZh": "界面", "titleEn": "UI" }
      ]
    }
  ],
  "nodes": [
    {
      "id": "n-hud",
      "type": "correspond.item",
      "x": 120,
      "y": 160,
      "data": {
        "title": "技能栏 HUD",
        "titleZh": "技能栏 HUD",
        "titleEn": "Skill HUD",
        "summaryZh": "战斗中展开的技能槽。",
        "summaryEn": "On-screen skill slots during combat.",
        "docs": [{ "label": "UI sheet", "url": "" }],
        "homes": { "system": "sys-skill", "discipline": "dis-ui" },
        "systemId": "sys-skill",
        "disciplineId": "dis-ui",
        "color": "#7ee0c6",
        "pos": {
          "system": { "x": 120, "y": 160 },
          "discipline": { "x": 360, "y": 160 }
        }
      }
    }
  ],
  "links": [
    {
      "id": "l1",
      "from": "n-hud",
      "fromSock": "out",
      "to": "n-exec",
      "toSock": "in",
      "label": "同一技能 ID",
      "labelZh": "同一技能 ID",
      "labelEn": "Same skill id"
    }
  ]
}
```

Legacy v1 files with only `systemTree` + `disciplineTree` still import. Extra custom axes may also arrive as `trees: { "chapter": [ ... ] }`.
