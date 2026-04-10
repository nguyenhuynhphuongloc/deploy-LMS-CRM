export const DAYS = [
  {
    key: "thu_2",
    label: "Thứ 2",
    headerBg: "from-white to-white",
    headerBorder: "border-b-red-400",
    columnBg: "bg-white",
  },
  {
    key: "thu_3",
    label: "Thứ 3",
    headerBg: "from-slate-100 to-slate-100",
    headerBorder: "border-b-slate-400",
    columnBg: "bg-slate-50",
  },
  {
    key: "thu_4",
    label: "Thứ 4",
    headerBg: "from-white to-white",
    headerBorder: "border-b-red-400",
    columnBg: "bg-white",
  },
  {
    key: "thu_5",
    label: "Thứ 5",
    headerBg: "from-slate-100 to-slate-100",
    headerBorder: "border-b-slate-400",
    columnBg: "bg-slate-50",
  },
  {
    key: "thu_6",
    label: "Thứ 6",
    headerBg: "from-white to-white",
    headerBorder: "border-b-red-400",
    columnBg: "bg-white",
  },
  {
    key: "thu_7",
    label: "Thứ 7",
    headerBg: "from-slate-100 to-slate-100",
    headerBorder: "border-b-slate-400",
    columnBg: "bg-slate-50",
  },
  {
    key: "chu_nhat",
    label: "Chủ Nhật",
    headerBg: "from-white to-white",
    headerBorder: "border-b-red-400",
    columnBg: "bg-white",
  },
];

export const SKILL_COLORS: Record<
  string,
  {
    card: string;
    border: string;
    name: string;
    skill: string;
    badge: string;
    dot: string;
  }
> = {
  speaking: {
    card: "from-rose-100 to-pink-100",
    border: "border-rose-300",
    name: "text-rose-900",
    skill: "text-rose-500",
    badge: "bg-rose-500",
    dot: "bg-rose-200 border-rose-400",
  },
  writing: {
    card: "from-amber-100 to-yellow-100",
    border: "border-amber-300",
    name: "text-amber-900",
    skill: "text-amber-600",
    badge: "bg-amber-500",
    dot: "bg-amber-200 border-amber-400",
  },
  reading: {
    card: "from-emerald-100 to-green-100",
    border: "border-emerald-300",
    name: "text-emerald-900",
    skill: "text-emerald-600",
    badge: "bg-emerald-500",
    dot: "bg-emerald-200 border-emerald-400",
  },
  listening: {
    card: "from-violet-100 to-purple-100",
    border: "border-violet-300",
    name: "text-violet-900",
    skill: "text-violet-500",
    badge: "bg-violet-500",
    dot: "bg-violet-200 border-violet-400",
  },
  grammar: {
    card: "from-cyan-100 to-sky-100",
    border: "border-cyan-300",
    name: "text-cyan-900",
    skill: "text-cyan-600",
    badge: "bg-cyan-500",
    dot: "bg-cyan-200 border-cyan-400",
  },
  vocabulary: {
    card: "from-teal-100 to-emerald-100",
    border: "border-teal-300",
    name: "text-teal-900",
    skill: "text-teal-600",
    badge: "bg-teal-500",
    dot: "bg-teal-200 border-teal-400",
  },
};

export const DEFAULT_SKILL_COLOR = SKILL_COLORS.speaking;

export const TEST_TYPE_COLORS: Record<string, string> = {
  midterm: "bg-red-500",
  final: "bg-emerald-500",
  mocktest: "bg-indigo-500",
};

export const TEST_TYPE_OPTIONS = [
  { label: "Midterm", value: "midterm" },
  { label: "Final", value: "final" },
  { label: "Mock Test", value: "mocktest" },
];

export const PART_TEST_OPTIONS = [
  { label: "Không có", value: "" },
  { label: "Part 1", value: "part_1" },
  { label: "Part 2", value: "part_2" },
  { label: "Part 3", value: "part_3" },
];

export const REGISTRATION_TYPES = [
  { label: "Học viên", value: "student" },
  { label: "Công việc", value: "work" },
];

export const WORK_TYPE_OPTIONS = [
  { label: "Marketing", value: "marketing" },
  { label: "OFF", value: "off" },
  { label: "Họp", value: "meeting" },
];

export const SCROLL_SPEED = 15;
export const SCROLL_THRESHOLD = 60;
