"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { DAYS, PART_TEST_OPTIONS, REGISTRATION_TYPES } from "./constants";
import { Video, MapPin } from "lucide-react";
import { ROLES } from "@/payload/access";

interface RegistrationModalProps {
  open: boolean;
  dayKey: string;
  slotKey: string;
  form: {
    registrationType: string;
    workType: string;
    studentId: string;
    studentName: string;
    className: string;
    skill: string;
    testType: string;
    testDescription: string;
    wowNote: string;
    partTest: string;
    meetingType?: string;
  };
  onClose: () => void;
  onSave: (formData: any) => void;
  user: any;
  readOnly?: boolean;
  isLoading?: boolean;
}

// Memoized Sub-components to prevent re-renders when typing
const ClassSelector = React.memo(({ value, classes, fetchingClasses, onChange }: any) => (
  <div className="mb-3.5">
    <label className="block text-xs font-bold text-red-500 mb-1">Lớp học</label>
    <select
      className="w-full px-3 py-2 border-[1.5px] border-slate-200 rounded-lg text-[13px] outline-none focus:border-red-500 transition-colors bg-white font-medium"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={fetchingClasses}
    >
      <option value="">{fetchingClasses ? "Đang tải..." : "-- Chọn lớp --"}</option>
      {classes.map((c: any) => (
        <option key={c.id} value={c.name}>{c.name}</option>
      ))}
    </select>
  </div>
));
ClassSelector.displayName = "ClassSelector";

const StudentSelector = React.memo(({ value, students, disabled, onChange, getStudentDisplayName }: any) => (
  <div className="mb-3.5">
    <label className="block text-xs font-bold text-red-500 mb-1">Học viên</label>
    <select
      className="w-full px-3 py-2 border-[1.5px] border-slate-200 rounded-lg text-[13px] outline-none focus:border-red-500 transition-colors bg-white font-medium"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      <option value="">{disabled ? "Vui lòng chọn lớp trước" : students.length === 0 ? "Lớp không có học viên" : "-- Chọn học viên --"}</option>
      {students.map((s: any) => (
        <option key={s.id} value={s.id}>{getStudentDisplayName(s)}</option>
      ))}
    </select>
  </div>
));
StudentSelector.displayName = "StudentSelector";

const MeetingTypeSelector = React.memo(({ value, onChange }: any) => (
  <div className="mb-4">
    <label className="block text-xs font-bold text-red-500 uppercase tracking-wider mb-2">Hình thức học</label>
    <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
      {[
        { value: "offline", label: "Offline", color: "text-slate-500" },
        { value: "online", label: "Online", color: "text-blue-600" },
      ].map((type) => {
        const active = (value || "online") === type.value;
        return (
          <button
            key={type.value}
            type="button"
            onClick={() => onChange(type.value)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-colors border-none ${
              active ? `bg-white ${type.color} shadow-sm scale-[1.02]` : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <span className="text-[13px] font-bold">{type.label}</span>
          </button>
        );
      })}
    </div>
  </div>
));
MeetingTypeSelector.displayName = "MeetingTypeSelector";

const TestTypeSelector = React.memo(({ value, onChange }: any) => (
  <div className="mb-3.5">
    <label className="block text-xs font-bold text-red-500 mb-1">Loại bài</label>
    <select
      className="w-full px-3 py-2 border-[1.5px] border-slate-200 rounded-lg text-[13px] outline-none bg-white cursor-pointer focus:border-red-500 transition-colors font-medium"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="mocktest">Mock Test</option>
      <option value="midterm">Midterm</option>
      <option value="final">Final</option>
    </select>
  </div>
));
TestTypeSelector.displayName = "TestTypeSelector";

const PartTestSelector = React.memo(({ value, options, onChange }: any) => (
  <div className="mb-3.5">
    <label className="block text-xs font-bold text-red-500 mb-1">Phần thi</label>
    <select
      className="w-full px-3 py-2 border-[1.5px] border-slate-200 rounded-lg text-[13px] outline-none focus:border-red-500 transition-colors bg-white font-medium"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="part_1,part_2,part_3">Full Mock Test (Part 1+2+3)</option>
      <option value="part_1">Chỉ Part 1</option>
      <option value="part_2">Chỉ Part 2</option>
      <option value="part_3">Chỉ Part 3</option>
      <option value="part_1,part_2">Part 1 + 2</option>
      <option value="part_2,part_3">Part 2 + 3</option>
    </select>
  </div>
));
PartTestSelector.displayName = "PartTestSelector";

const RegistrationTypeTabs = React.memo(({ value, onChange }: any) => (
  <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
    {REGISTRATION_TYPES.map((t) => (
      <div
        key={t.value}
        onClick={() => onChange(t.value)}
        className={`flex-1 py-2 text-[13px] font-bold rounded-lg transition-colors text-center cursor-pointer ${
          value === t.value ? "bg-white text-red-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
        }`}
      >
        {t.label}
      </div>
    ))}
  </div>
));
RegistrationTypeTabs.displayName = "RegistrationTypeTabs";

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  open,
  dayKey,
  slotKey,
  form: initialForm,
  onClose,
  onSave,
  user,
  readOnly = false,
  isLoading = false,
}) => {
  const [classes, setClasses] = useState<any[]>([]);
  const [studentsInClass, setStudentsInClass] = useState<any[]>([]);
  const [fetchingClasses, setFetchingClasses] = useState(false);
  const [form, setLocalForm] = useState(initialForm);
  
  // Use REFs for high-frequency text inputs to COMPLETELY BYPASS React render cycle
  const workTypeRef = useRef<HTMLInputElement>(null);
  const wowNoteRef = useRef<HTMLTextAreaElement>(null);

  // Sync internal state when props change
  useEffect(() => {
    if (open) {
      setLocalForm(initialForm);
      if (workTypeRef.current) workTypeRef.current.value = initialForm.workType || "";
      if (wowNoteRef.current) wowNoteRef.current.value = initialForm.wowNote || "";
    }
  }, [open, initialForm]);

  // Fetch classes logic
  useEffect(() => {
    if (open && !readOnly && form.registrationType === "student") {
      const fetchClasses = async () => {
        setFetchingClasses(true);
        try {
          let url = "/api/classes?limit=1000&sort=name&depth=2";
          
          // Filter classes for Teachers (only show classes they are in charge of)
          if (user?.role === ROLES.TEACHER_FULL_TIME || user?.role === ROLES.TEACHER_PART_TIME) {
            url += `&where[teachers.teacher][equals]=${user.id}`;
          }

          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            setClasses(data.docs || []);
          }
        } catch (error) {
          console.error("Lỗi fetch classes:", error);
        } finally {
          setFetchingClasses(false);
        }
      };
      fetchClasses();
    }
  }, [open, readOnly, form.registrationType, user]);

  // Update students in class logic
  useEffect(() => {
    if (form.className && classes.length > 0) {
      const selectedClass = classes.find((c) => c.name === form.className);
      if (selectedClass && selectedClass.students) {
        setStudentsInClass(selectedClass.students);
      } else {
        setStudentsInClass([]);
      }
    }
  }, [form.className, classes]);

  if (!open) return null;

  const isStudent = form.registrationType === "student";

  const getStudentDisplayName = useCallback((s: any) => {
    if (s.lead && typeof s.lead === "object") {
      return s.lead.fullName || s.username || s.email || s.id;
    }
    return s.username || s.email || s.id;
  }, []);

  const handleClassChange = useCallback((className: string) => {
    setLocalForm(prev => ({ ...prev, className, studentName: "", studentId: "" }));
  }, []);

  const handleStudentChange = useCallback((studentId: string) => {
    const student = studentsInClass.find((s) => s.id === studentId);
    if (student) {
      setLocalForm(prev => ({
        ...prev,
        studentId: student.id,
        studentName: getStudentDisplayName(student),
      }));
    }
  }, [studentsInClass, getStudentDisplayName]);

  const handleMeetingTypeChange = useCallback((meetingType: string) => {
    setLocalForm(prev => ({ ...prev, meetingType }));
  }, []);

  const handleTestTypeChange = useCallback((testType: string) => {
    setLocalForm(prev => {
      const updates: any = { testType };
      if (testType === "mocktest") {
        updates.partTest = "part_1,part_2,part_3";
      }
      return { ...prev, ...updates };
    });
  }, []);

  const handlePartTestChange = useCallback((partTest: string) => {
    setLocalForm(prev => ({ ...prev, partTest }));
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl px-8 py-7 w-[420px] max-w-[90vw] shadow-2xl animate-in slide-in-from-bottom-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-lg font-bold text-slate-800 mb-5 flex justify-between items-center">
          <span>Đăng ký – {DAYS.find((d) => d.key === dayKey)?.label}</span>
        </div>

        {/* Registration Type Tabs - Only visible to WOW Manager and WOW Executive */}
        {!readOnly && user?.role && (user.role === ROLES.WOW_MANAGER || user.role === ROLES.WOW_EXECUTIVE) && (
          <RegistrationTypeTabs
            value={form.registrationType}
            onChange={(type: string) => setLocalForm({ ...form, registrationType: type })}
          />
        )}

        {isStudent || readOnly ? (
          <div className="animate-in fade-in slide-in-from-left-2 duration-300">
            {readOnly ? (
              /* Automated Info Display (Student View) */
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">
                <div className="text-sm font-bold text-red-500">
                  Học viên:{" "}
                  <span className="text-slate-800">
                    {form.studentName || "Đang tải..."}
                  </span>
                </div>
                <div className="text-sm text-red-500 font-bold mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                  Lớp:
                  <span className="text-slate-800">
                    {" "}
                    {form.className || "Chưa có mã lớp"}
                  </span>
                </div>
              </div>
            ) : (
              /* Automated Selection (Admin View) */
              <>
                <ClassSelector
                  value={form.className}
                  classes={classes}
                  fetchingClasses={fetchingClasses}
                  onChange={handleClassChange}
                />
                <StudentSelector
                  value={form.studentId}
                  students={studentsInClass}
                  disabled={!form.className || studentsInClass.length === 0}
                  onChange={handleStudentChange}
                  getStudentDisplayName={getStudentDisplayName}
                />
              </>
            )}

            {/* Online/Offline Selection */}
            <MeetingTypeSelector
              value={form.meetingType}
              onChange={handleMeetingTypeChange}
            />

            <TestTypeSelector
              value={form.testType}
              onChange={handleTestTypeChange}
            />

            {form.testType === "mocktest" && (
              <PartTestSelector
                value={form.partTest}
                options={PART_TEST_OPTIONS}
                onChange={handlePartTestChange}
              />
            )}

            <div className="mb-3.5">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Ghi chú
              </label>
              <textarea
                ref={wowNoteRef}
                className="w-full px-3 py-2 border-[1.5px] border-slate-200 rounded-lg text-[13px] outline-none resize-y min-h-[70px] focus:border-red-500 transition-colors text-slate-700"
                defaultValue={initialForm.wowNote || ""}
                placeholder="Chủ đề muốn luyện tập..."
              />
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-2 duration-300">
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                Nội dung công việc
              </label>
              <input
                ref={workTypeRef}
                className="w-full px-4 py-4 bg-slate-50 border-[1.5px] border-slate-200 rounded-xl text-sm font-bold text-red-600 outline-none focus:border-red-500 focus:bg-white transition-all shadow-sm"
                defaultValue={initialForm.workType || ""}
                placeholder="Nhập nội dung công việc..."
                autoFocus
              />
            </div>
          </div>
        )}

        <div className="flex gap-2.5 justify-end mt-8 border-t border-slate-100 pt-6">
          <div
            className={`px-[18px] py-2.5 border-[1.5px] border-slate-400 bg-slate-200 rounded-lg text-[13px] font-bold text-slate-500 transition-colors ${isLoading ? "opacity-50 pointer-events-none" : "cursor-pointer hover:bg-slate-300"}`}
            onClick={isLoading ? undefined : onClose}
          >
            Hủy
          </div>
          <div
            className={`px-[24px] py-2.5 border-none bg-red-500 rounded-lg text-[13px] font-bold text-white shadow-lg shadow-red-100 transition-colors ${
              (isStudent && !readOnly && !form.studentId) || isLoading
                ? "opacity-50 pointer-events-none"
                : "cursor-pointer hover:bg-red-600 active:scale-95"
            }`}
            onClick={
              (isStudent && !readOnly && !form.studentId) || isLoading
                ? undefined
                : () => 
                    onSave({ 
                      ...form, 
                      workType: workTypeRef.current?.value || "", 
                      wowNote: wowNoteRef.current?.value || "" 
                    })
            }
          >
            {isLoading ? "Đang xử lý..." : "Hoàn tất"}
          </div>
        </div>
      </div>
    </div>
  );
};
