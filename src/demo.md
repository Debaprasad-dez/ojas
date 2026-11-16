# Demo reply

Markdown **bold**, *italic*, `inline code`, and a [link](https://example.com).

- List item
- Another item

| Plan | Price |
| ---- | ----- |
| Free | $0    |
| Pro  | $9    |

```js
const greet = (name) => `Hello, ${name}`
```

```info
Info callout.
```

```warning
Warning callout with **markdown**:
- a list item
- a [link](https://example.com)
```

```error
Error callout.
```

```chart
{"type":"column","title":"Revenue","categories":["Q1","Q2","Q3","Q4"],"series":[{"name":"2025","data":[12,19,15,24]},{"name":"2026","data":[16,22,21,30]}]}
```

```chart
{"type":"pie","title":"Share","categories":["A","B","C"],"series":[{"name":"Share","data":[50,30,20]}]}
```

```table
{"columns":["Name","Role","Score"],"rows":[["Ada","Engineer",92],["Linus","Maintainer",88],["Grace","Admiral",95]]}
```

```flowchart
{"direction":"TD","nodes":[{"id":"start","label":"User sends message","shape":"start"},{"id":"demo","label":"Is it \"/demo\"?","shape":"decision"},{"id":"api","label":"Call model #1","shape":"process"},{"id":"show","label":"Show sample reply","shape":"process"},{"id":"end","label":"Render reply","shape":"end"}],"edges":[{"from":"start","to":"demo"},{"from":"demo","to":"show","label":"yes"},{"from":"demo","to":"api","label":"no"},{"from":"api","to":"end"},{"from":"show","to":"end"}]}
```

Invalid block falls back to plain code:

```chart
{"type":"oops"}
```
