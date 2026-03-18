# Reference - Windguru Colors

Colors extracted from https://www.windguru.cz/ajax/ajax_colors.php (CSS gradients).
These are the **official Windguru defaults** used across all their forecasts.

## Wind Speed (0–70 knots)

```
 0kn        10kn       20kn       30kn       40kn       50kn       60kn      70kn
 ├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
 │  white   │cyan│green│ yellow│  red  │ pink │magenta│ purple │    blue        │
 └──────────┴────┴─────┴───────┴───────┴──────┴───────┴────────┴───────────────┘
```

CSS gradient:

```
linear-gradient(to right,
  rgba(255,255,255,1) 0%,     /* 0.0 kn */
  rgba(255,255,255,1) 7%,     /* 4.9 kn */
  rgba(103,247,241,1) 13%,    /* 9.1 kn */
  rgba(0,255,0,1) 19%,        /* 13.3 kn */
  rgba(255,240,0,1) 27%,      /* 18.9 kn */
  rgba(255,50,44,1) 35%,      /* 24.5 kn */
  rgba(255,10,200,1) 45%,     /* 31.5 kn */
  rgba(255,0,255,1) 54%,      /* 37.8 kn */
  rgba(150,50,255,1) 64%,     /* 44.8 kn */
  rgba(60,60,255,1) 86%,      /* 60.2 kn */
  rgba(0,0,255,1) 100%        /* 70.0 kn */
)
```

TypeScript stops:

```typescript
const WIND_STOPS: [number, string][] = [
  [0, "#FFFFFF"], // white
  [4.9, "#FFFFFF"], // white (holds until ~5kn)
  [9.1, "#67F7F1"], // cyan
  [13.3, "#00FF00"], // green
  [18.9, "#FFF000"], // yellow
  [24.5, "#FF322C"], // red
  [31.5, "#FF0AC8"], // pink
  [37.8, "#FF00FF"], // magenta
  [44.8, "#9632FF"], // purple
  [60.2, "#3C3CFF"], // blue
  [70, "#0000FF"], // deep blue
];
```

**Comparison with current implementation (`src/lib/wind-colors.ts`):**

The current code uses the correct hex colors but maps them to a compressed 0–60 range.
The actual Windguru gradient spreads over 0–70 with different breakpoints:

| Current (wrong) | Windguru (correct) | Shift                    |
| --------------- | ------------------ | ------------------------ |
| 0 → `#FFFFFF`   | 0–4.9 → `#FFFFFF`  | WG holds white until 4.9 |
| 5 → `#67F7F1`   | 9.1 → `#67F7F1`    | **+4.1 kn**              |
| 10 → `#00FF00`  | 13.3 → `#00FF00`   | **+3.3 kn**              |
| 15 → `#FFF000`  | 18.9 → `#FFF000`   | **+3.9 kn**              |
| 20 → `#FF322C`  | 24.5 → `#FF322C`   | **+4.5 kn**              |
| 25 → `#FF0AC8`  | 31.5 → `#FF0AC8`   | **+6.5 kn**              |
| 30 → `#FF00FF`  | 37.8 → `#FF00FF`   | **+7.8 kn**              |
| 40 → `#9632FF`  | 44.8 → `#9632FF`   | **+4.8 kn**              |
| 50 → `#3C3CFF`  | 60.2 → `#3C3CFF`   | **+10.2 kn**             |
| 60 → `#0000FF`  | 70.0 → `#0000FF`   | **+10.0 kn**             |

---

## Wave Height (0–15 meters)

```
 0m         3m         6m         9m         12m        15m
 ├──────────┼──────────┼──────────┼──────────┼──────────┤
 │  white   │  blue    │ purple │    red    │   orange/yellow  │
 └──────────┴──────────┴────────┴──────────┴──────────────────┘
```

CSS gradient:

```
linear-gradient(to right,
  rgba(255,255,255,1) 0%,     /* 0.0 m */
  rgba(255,255,255,1) 2%,     /* 0.3 m */
  rgba(122,131,255,1) 20%,    /* 3.0 m */
  rgba(173,90,201,1) 33%,     /* 4.95 m */
  rgba(255,80,100,1) 53%,     /* 7.95 m */
  rgba(255,200,100,1) 100%    /* 15.0 m */
)
```

TypeScript stops:

```typescript
const WAVE_HEIGHT_STOPS: [number, string][] = [
  [0, "#FFFFFF"], // white
  [0.3, "#FFFFFF"], // white (holds until 0.3m)
  [3, "#7A83FF"], // blue
  [4.95, "#AD5AC9"], // purple
  [7.95, "#FF5064"], // red-pink
  [15, "#FFC864"], // orange-yellow
];
```

---

## Wave Period (0–20 seconds)

```
 0s                    10s                   20s
 ├─────────────────────┼─────────────────────┤
 │       white         │        → red        │
 └─────────────────────┴─────────────────────┘
```

CSS gradient:

```
linear-gradient(to right,
  rgba(255,255,255,1) 0%,     /* 0 s */
  rgba(255,255,255,1) 50%,    /* 10 s */
  rgba(252,81,81,1) 100%      /* 20 s */
)
```

TypeScript stops:

```typescript
const WAVE_PERIOD_STOPS: [number, string][] = [
  [0, "#FFFFFF"], // white
  [10, "#FFFFFF"], // white (holds until 10s)
  [20, "#FC5151"], // red
];
```
