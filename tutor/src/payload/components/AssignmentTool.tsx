"use client";
import { useAuth, useField, useForm, useFormFields } from "@payloadcms/ui";
import { format } from "date-fns";
import React, { useEffect, useMemo, useState } from "react";
import { SkillIcon } from "@/components/Common/SkillIcon";

// Color constants from user rules
const COLORS = {
  primary: "#E72929",
  success: "#23BD33",
  warning: "#FBA631",
  secondary: "#A8ABB2",
  other: "#3FAFC6",
};

export const AssignmentTool: React.FC<{ path: string }> = ({ path }) => {
  const { user } = useAuth();
  const { submit } = useForm();
  const classId = useFormFields(([fields]) => fields.class?.value) as string;
  const typeClass = useFormFields(
    ([fields]) => fields.type_class?.value,
  ) as string;
  const { value: jsonData, setValue: setJsonData } = useField<any>({
    path: "data",
  });

  const [classDoc, setClassDoc] = useState<any>(null);
  console.log(classDoc);
  const [selectedSessionIndex, setSelectedSessionIndex] = useState<
    number | string | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Local state for the currently edited session's homework
  const [homework, setHomework] = useState<string[]>([]);
  const [extraHomework, setExtraHomework] = useState<string[]>([]);
  const [midTest, setMidTest] = useState<string[]>([]);
  const [finalTest, setFinalTest] = useState<string[]>([]);
  const [linkRecording, setLinkRecording] = useState<string>("");

  const [availableHomeworks, setAvailableHomeworks] = useState<any[]>([]);
  const [availableExtraHomeworks, setAvailableExtraHomeworks] = useState<any[]>(
    [],
  );
  const [availableMidTests, setAvailableMidTests] = useState<any[]>([]);
  const [availableFinalTests, setAvailableFinalTests] = useState<any[]>([]);

  // Fetch class doc (only for sessions structure)
  useEffect(() => {
    if (!classId) return;
    setLoading(true);
    fetch(`/api/classes/${classId}?depth=2`)
      .then((res) => res.json())
      .then((data) => {
        setClassDoc(data);
        setLoading(false);
      });
  }, [classId]);

  const [attempts, setAttempts] = useState<any[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  // Fetch attempts for the selected session
  useEffect(() => {
    if (!classId || selectedSessionIndex === null) return;
    setLoadingAttempts(true);
    const query: any = {
      class: { equals: classId },
    };
    if (typeof selectedSessionIndex === "number") {
      query.session = { equals: selectedSessionIndex };
    }
    const stringifiedQuery = encodeURIComponent(JSON.stringify(query));
    fetch(`/api/periodic_test_attempts?where=${stringifiedQuery}&limit=1000`)
      .then((res) => res.json())
      .then((data) => {
        setAttempts(data.docs || []);
        setLoadingAttempts(false);
      });
  }, [classId, selectedSessionIndex]);

  // Fetch all possible homeworks/tests
  useEffect(() => {
    fetch(`/api/periodic_tests?limit=1000`)
      .then((res) => res.json())
      .then((data) => {
        const docs = data.docs || [];
        setAvailableHomeworks(docs.filter((d: any) => d.type === "homework"));
        setAvailableExtraHomeworks(
          docs.filter((d: any) => d.type === "extra_homework"),
        );
        setAvailableMidTests(docs.filter((d: any) => d.type === "mid_term"));
        setAvailableFinalTests(
          docs.filter((d: any) => d.type === "final_term"),
        );
      });
  }, []);

  // Filter sessions where current teacher is assigned
  const teacherSessions = useMemo(() => {
    if (!classDoc || !user) return [];
    return (
      classDoc.sessions
        ?.map((s: any, idx: number) => ({ ...s, originalIndex: idx }))
        .filter((s: any) => {
          const sessionTeacherId =
            typeof s.teacher === "object" ? s.teacher?.id : s.teacher;
          return sessionTeacherId === user.id || user.role === "admin";
        }) || []
    );
  }, [classDoc, user]);

  const isTeacherInClass = useMemo(() => {
    if (!classDoc || !user) return false;
    if (user.role === "admin") return true;
    return classDoc.teachers?.some((t: any) => {
      const teacherId =
        typeof t.teacher === "object" ? t.teacher?.id : t.teacher;
      return teacherId === user.id;
    });
  }, [classDoc, user]);

  // Load existing data from JSON field when session is selected
  useEffect(() => {
    if (selectedSessionIndex === null) return;
    const sessionData = jsonData?.[selectedSessionIndex] || {};

    setHomework(sessionData.homework || []);
    setExtraHomework(sessionData.extra_homework || []);
    setMidTest(sessionData.mid_test || []);
    setFinalTest(sessionData.final_test || []);
    setLinkRecording(sessionData.link_recording || "");
  }, [selectedSessionIndex, jsonData]);

  // Logic for Mid-term / Final-term visibility
  const sessionLogic = useMemo(() => {
    if (selectedSessionIndex === null || !classDoc)
      return { isMid: false, isFinal: false };

    if (
      selectedSessionIndex === "midterm" ||
      (typeof selectedSessionIndex === "string" &&
        selectedSessionIndex.startsWith("periodic-"))
    )
      return { isMid: true, isFinal: false };
    if (selectedSessionIndex === "final")
      return { isMid: false, isFinal: true };

    const sessions = classDoc.sessions || [];
    const index = selectedSessionIndex as number;

    let isMid = false;
    let isFinal = index === sessions.length - 1;

    if (typeClass === "one_to_one") {
      const timePerSession = classDoc.time_per_session || 0;
      const cumulativeHoursBefore = index * timePerSession;
      const cumulativeHoursAfter = (index + 1) * timePerSession;
      const testThreshold = 24;
      isMid =
        Math.floor(cumulativeHoursAfter / testThreshold) >
        Math.floor(cumulativeHoursBefore / testThreshold);
    } else {
      isMid = index === Math.floor(sessions.length / 2) - 1;
    }

    return { isMid, isFinal };
  }, [selectedSessionIndex, classDoc, typeClass]);

  const numPeriodic = useMemo(() => {
    if (typeClass !== "one_to_one" || !classDoc) return 0;
    return Math.floor((classDoc.total_hours || 0) / 24);
  }, [classDoc, typeClass]);

  const handleSave = async () => {
    if (selectedSessionIndex === null) return;
    setSaving(true);

    const currentData = jsonData || {};
    const sessionUpdates = {
      homework,
      extra_homework: extraHomework,
      mid_test: midTest,
      final_test: finalTest,
      link_recording: linkRecording,
    };

    const newData = {
      ...currentData,
      [selectedSessionIndex as any]: sessionUpdates,
    };

    setJsonData(newData);

    // Trigger Payload form submit
    setTimeout(() => {
      submit();
      setSaving(false);
    }, 100);
  };

  if (loading) return <div>Đang tải dữ liệu lớp học...</div>;
  if (!classId) return <div>Vui lòng chọn lớp học.</div>;

  return (
    <div
      style={{
        background: "#fdfdfd",
        padding: "24px",
        borderRadius: "16px",
        border: `2px solid ${COLORS.primary}22`,
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <h3
          style={{
            margin: 0,
            color: COLORS.primary,
            fontSize: "1.4rem",
            fontWeight: "800",
            letterSpacing: "-0.5px",
          }}
        >
          🚀 GIAO BÀI TẬP
        </h3>
        <div
          style={{
            background: COLORS.primary,
            color: "#fff",
            padding: "4px 12px",
            borderRadius: "20px",
            fontSize: "0.75rem",
            fontWeight: "700",
          }}
        >
          {classDoc?.name || "..."}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Session Selection */}
        <div>
          <label
            style={{
              display: "block",
              marginBottom: "10px",
              fontWeight: "700",
              color: "#444",
              fontSize: "0.9rem",
            }}
          >
            1. CHỌN BUỔI HỌC CỦA BẠN (Đã lọc theo lịch dạy)
          </label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: "10px",
            }}
          >
            {teacherSessions.map((s: any) => (
              <button
                key={s.originalIndex}
                type="button"
                onClick={() => setSelectedSessionIndex(s.originalIndex)}
                style={{
                  padding: "12px 8px",
                  borderRadius: "10px",
                  border: `2px solid ${selectedSessionIndex === s.originalIndex ? COLORS.primary : "#eee"}`,
                  background:
                    selectedSessionIndex === s.originalIndex
                      ? `${COLORS.primary}11`
                      : "#fff",
                  color:
                    selectedSessionIndex === s.originalIndex
                      ? COLORS.primary
                      : "#666",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  textAlign: "center",
                  transition: "all 0.2s ease",
                  fontWeight:
                    selectedSessionIndex === s.originalIndex ? "700" : "500",
                }}
              >
                Buổi {s.originalIndex + 1}
                <div
                  style={{ fontSize: "0.7rem", opacity: 0.8, marginTop: "4px" }}
                >
                  {s.date ? format(new Date(s.date), "dd/MM/yyyy") : "N/A"}
                </div>
              </button>
            ))}
            {isTeacherInClass && (
              <>
                {typeClass === "group" ? (
                  <button
                    type="button"
                    onClick={() => setSelectedSessionIndex("midterm")}
                    style={{
                      padding: "12px 8px",
                      borderRadius: "10px",
                      border: `2px solid ${selectedSessionIndex === "midterm" ? COLORS.warning : "#eee"}`,
                      background:
                        selectedSessionIndex === "midterm"
                          ? `${COLORS.warning}11`
                          : "#fff",
                      color:
                        selectedSessionIndex === "midterm"
                          ? COLORS.warning
                          : "#666",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      textAlign: "center",
                      transition: "all 0.2s ease",
                      fontWeight:
                        selectedSessionIndex === "midterm" ? "700" : "500",
                    }}
                  >
                    🔥 Giữa kỳ
                  </button>
                ) : (
                  Array.from({ length: numPeriodic }).map((_, i) => {
                    const n = i + 1;
                    const key = `periodic-${n}`;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedSessionIndex(key)}
                        style={{
                          padding: "12px 8px",
                          borderRadius: "10px",
                          border: `2px solid ${selectedSessionIndex === key ? COLORS.warning : "#eee"}`,
                          background:
                            selectedSessionIndex === key
                              ? `${COLORS.warning}11`
                              : "#fff",
                          color:
                            selectedSessionIndex === key
                              ? COLORS.warning
                              : "#666",
                          cursor: "pointer",
                          fontSize: "0.85rem",
                          textAlign: "center",
                          transition: "all 0.2s ease",
                          fontWeight:
                            selectedSessionIndex === key ? "700" : "500",
                        }}
                      >
                        🔥 Kiểm tra định kỳ {n} ({n * 24} tiếng)
                      </button>
                    );
                  })
                )}
                <button
                  type="button"
                  onClick={() => setSelectedSessionIndex("final")}
                  style={{
                    padding: "12px 8px",
                    borderRadius: "10px",
                    border: `2px solid ${selectedSessionIndex === "final" ? COLORS.success : "#eee"}`,
                    background:
                      selectedSessionIndex === "final"
                        ? `${COLORS.success}11`
                        : "#fff",
                    color:
                      selectedSessionIndex === "final"
                        ? COLORS.success
                        : "#666",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    textAlign: "center",
                    transition: "all 0.2s ease",
                    fontWeight: selectedSessionIndex === "final" ? "700" : "500",
                  }}
                >
                  🏆 Cuối kỳ
                </button>
              </>
            )}
            {teacherSessions.length === 0 && !isTeacherInClass && (
              <p style={{ color: COLORS.secondary, fontSize: "0.9rem" }}>
                Bạn không có buổi dạy nào được ghi nhận trong lớp này.
              </p>
            )}
          </div>
        </div>

        {selectedSessionIndex !== null && (
          <>
            <div
              style={{
                marginTop: "10px",
                padding: "20px",
                background: "#fff",
                borderRadius: "12px",
                border: "1px solid #efefef",
                animation: "fadeIn 0.3s ease-out",
              }}
            >
              <h4
                style={{
                  margin: "0 0 20px 0",
                  color: "#333",
                  borderBottom: `2px solid ${COLORS.primary}11`,
                  paddingBottom: "10px",
                }}
              >
                {typeof selectedSessionIndex === "number"
                  ? `📝 Giao bài buổi số ${selectedSessionIndex + 1}`
                  : selectedSessionIndex === "midterm"
                    ? "🔥 Giao bài thi Giữa kỳ"
                    : selectedSessionIndex === "final"
                      ? "🏆 Giao bài thi Cuối kỳ"
                      : `🔥 Kiểm tra định kỳ ${selectedSessionIndex.split("-")[1]} (${Number(selectedSessionIndex.split("-")[1]) * 24} tiếng)`}
                </h4>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "24px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  {typeof selectedSessionIndex === "number" ? (
                    <>
                      <AssignmentSelect
                        label="Bài tập về nhà"
                        value={homework}
                        onChange={setHomework}
                        options={availableHomeworks}
                        color={COLORS.other}
                      />
                      <AssignmentSelect
                        label="Bài tập bổ trợ"
                        value={extraHomework}
                        onChange={setExtraHomework}
                        options={availableExtraHomeworks}
                        color={COLORS.secondary}
                      />
                    </>
                  ) : (
                    <div
                      style={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "2px dashed #eee",
                        borderRadius: "10px",
                        color: COLORS.secondary,
                        fontSize: "0.85rem",
                        padding: "20px",
                        textAlign: "center",
                        background: "#fdfdfd",
                      }}
                    >
                      <div style={{ fontSize: "2rem", marginBottom: "10px" }}>
                        🎯
                      </div>
                      Mục này dành riêng cho việc giao bài thi
                      <br />
                      {typeof selectedSessionIndex === "string" &&
                      selectedSessionIndex.startsWith("periodic-")
                        ? `Kiểm tra định kỳ ${selectedSessionIndex.split("-")[1]} (${Number(selectedSessionIndex.split("-")[1]) * 24} tiếng)`
                        : selectedSessionIndex === "midterm"
                          ? "Giữa kỳ"
                          : "Cuối kỳ"}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  {sessionLogic.isMid && isTeacherInClass && (
                    <AssignmentSelect
                      label={
                        typeof selectedSessionIndex === "string" &&
                        selectedSessionIndex.startsWith("periodic-")
                          ? `🔥 Kiểm tra định kỳ ${selectedSessionIndex.split("-")[1]} (${Number(selectedSessionIndex.split("-")[1]) * 24} tiếng)`
                          : "🔥 Bài thi giữa kỳ"
                      }
                      value={midTest}
                      onChange={setMidTest}
                      options={availableMidTests}
                      color={COLORS.warning}
                    />
                  )}
                  {sessionLogic.isFinal && isTeacherInClass && (
                    <AssignmentSelect
                      label="🏆 Bài thi cuối kỳ"
                      value={finalTest}
                      onChange={setFinalTest}
                      options={availableFinalTests}
                      color={COLORS.success}
                    />
                  )}
                  {((sessionLogic.isMid || sessionLogic.isFinal) && !isTeacherInClass) && (
                    <div
                      style={{
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "2px dashed #eee",
                        borderRadius: "10px",
                        color: COLORS.secondary,
                        fontSize: "0.85rem",
                        padding: "20px",
                        textAlign: "center",
                      }}
                    >
                      Chỉ giảng viên phụ trách mới có quyền giao bài tập giữa kỳ/cuối kỳ.
                    </div>
                  )}
                  {!sessionLogic.isMid && !sessionLogic.isFinal && (
                    <div
                      style={{
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "2px dashed #eee",
                        borderRadius: "10px",
                        color: COLORS.secondary,
                        fontSize: "0.85rem",
                        padding: "20px",
                        textAlign: "center",
                      }}
                    >
                      Buổi học này không có bài kiểm tra định kỳ.
                    </div>
                  )}
                </div>
              </div>

                {typeof selectedSessionIndex === "number" && (
                  <div style={{ marginTop: "24px" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: "700",
                        color: "#444",
                        fontSize: "0.9rem",
                      }}
                    >
                      📹 LINK RECORDING BUỔI HỌC
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        placeholder="Dán link recording của buổi học này vào đây..."
                        value={linkRecording}
                        onChange={(e) => setLinkRecording(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "12px 16px 12px 44px",
                          borderRadius: "10px",
                          border: `2px solid ${linkRecording ? COLORS.other : "#eee"}`,
                          fontSize: "0.9rem",
                          outline: "none",
                          transition: "all 0.2s",
                          background: "#f9f9f9",
                        }}
                        onFocus={(e) =>
                          (e.target.style.border = `2px solid ${COLORS.other}`)
                        }
                        onBlur={(e) =>
                          (e.target.style.border = `2px solid ${linkRecording ? COLORS.other : "#eee"}`)
                        }
                      />
                      <div
                        style={{
                          position: "absolute",
                          left: "14px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: linkRecording ? COLORS.other : "#aaa",
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M23 7l-7 5 7 5V7z" />
                          <rect
                            x="1"
                            y="5"
                            width="15"
                            height="14"
                            rx="2"
                            ry="2"
                          />
                        </svg>
                      </div>
                    </div>
                    <p
                      style={{
                        fontSize: "0.75rem",
                        color: "#888",
                        marginTop: "6px",
                      }}
                    >
                      Link này sẽ được hiển thị cho học viên trong phần chi tiết
                      buổi học.
                    </p>
                  </div>
                )}

              <div
                style={{
                  marginTop: "30px",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                  alignItems: "center",
                }}
              >
                {jsonData?.[selectedSessionIndex] && (
                  <span
                    style={{
                      color: COLORS.success,
                      fontSize: "0.85rem",
                      fontWeight: "600",
                    }}
                  >
                    ✓ Đã có bài tập
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    background: COLORS.primary,
                    color: "#fff",
                    border: "none",
                    padding: "12px 32px",
                    borderRadius: "10px",
                    fontWeight: "700",
                    cursor: "pointer",
                    boxShadow: `0 4px 14px ${COLORS.primary}44`,
                    transition: "transform 0.2s",
                  }}
                >
                  {saving ? "ĐANG LƯU..." : "LƯU BÀI TẬP"}
                </button>
              </div>
            </div>

            {/* Student Participation Status */}
            <div
              style={{
                marginTop: "10px",
                padding: "20px",
                background: "#fff",
                borderRadius: "12px",
                border: "1px solid #efefef",
                animation: "fadeIn 0.3s ease-out",
              }}
            >
              <h4
                style={{
                  margin: "0 0 20px 0",
                  color: "#333",
                  borderBottom: `2px solid ${COLORS.primary}11`,
                  paddingBottom: "10px",
                }}
              >
                📊 Trạng thái làm bài của học viên
              </h4>

              {loadingAttempts ? (
                <div style={{ color: COLORS.secondary, fontSize: "0.9rem" }}>
                  Đang tải trạng thái làm bài...
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "0.85rem",
                    }}
                  >
                    <thead>
                      <tr style={{ background: "#f9f9f9", textAlign: "left" }}>
                        <th
                          style={{
                            padding: "12px",
                            borderBottom: "2px solid #eee",
                          }}
                        >
                          Học viên
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            borderBottom: "2px solid #eee",
                          }}
                        >
                          Tình trạng
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {classDoc?.students?.map((student: any) => {
                        console.log(student);
                        const studentId =
                          typeof student === "object" ? student.id : student;
                        const studentName =
                          typeof student === "object"
                            ? student.lead?.fullName
                            : "Student";

                        // Current assignments for this session
                        const currentAssignments = [
                          ...homework.map((id) => ({ id, type: "homework" })),
                          ...extraHomework.map((id) => ({
                            id,
                            type: "extra_homework",
                          })),
                          ...midTest.map((id) => ({ id, type: "mid_term" })),
                          ...finalTest.map((id) => ({
                            id,
                            type: "final_term",
                          })),
                        ];

                        return (
                          <tr
                            key={studentId}
                            style={{ borderBottom: "1px solid #eee" }}
                          >
                            <td style={{ padding: "12px", fontWeight: "600" }}>
                              {studentName}
                            </td>
                            <td style={{ padding: "12px" }}>
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "6px",
                                }}
                              >
                                {currentAssignments.length === 0 ? (
                                  <span
                                    style={{
                                      color: COLORS.secondary,
                                      fontStyle: "italic",
                                    }}
                                  >
                                    Chưa giao bài tập
                                  </span>
                                ) : (
                                  currentAssignments.map((assignment) => {
                                    const allPossible = [
                                      ...availableHomeworks,
                                      ...availableExtraHomeworks,
                                      ...availableMidTests,
                                      ...availableFinalTests,
                                    ];
                                    const testDoc = allPossible.find(
                                      (t) => t.id === assignment.id,
                                    );
                                    const attempt = attempts.find(
                                      (a) =>
                                        (typeof a.user === "object"
                                          ? a.user.id
                                          : a.user) === studentId &&
                                        (typeof a.test === "object"
                                          ? a.test.id
                                          : a.test) === assignment.id,
                                    );

                                    return (
                                      <div
                                        key={assignment.id}
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "10px",
                                        }}
                                      >
                                        <div
                                          style={{
                                            minWidth: "150px",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                          }}
                                        >
                                          {testDoc?.tests?.map((t: any) => (
                                            <span
                                              key={t.id || t}
                                              title={t.type}
                                              style={{ fontSize: "1rem" }}
                                            >
                                              <SkillIcon 
                                                skill={typeof t === "object" ? t.type : ""} 
                                                size={16} 
                                              />
                                            </span>
                                          ))}
                                          <span style={{ fontWeight: "500" }}>
                                            {testDoc?.title || "..."}
                                          </span>
                                        </div>
                                        {attempt ? (
                                          <div
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: "8px",
                                            }}
                                          >
                                            <span
                                              style={{
                                                color:
                                                  attempt.status === "completed"
                                                    ? COLORS.success
                                                    : COLORS.warning,
                                                background:
                                                  attempt.status === "completed"
                                                    ? `${COLORS.success}11`
                                                    : `${COLORS.warning}11`,
                                                padding: "2px 8px",
                                                borderRadius: "12px",
                                                fontSize: "0.75rem",
                                                fontWeight: "700",
                                              }}
                                            >
                                              {attempt.status === "completed"
                                                ? "ĐÃ XONG"
                                                : "ĐANG LÀM"}
                                            </span>
                                            {attempt.status === "completed" && (
                                              <a
                                                href={`/admin/collections/periodic_test_attempts/${attempt.id}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{
                                                  display: "flex",
                                                  alignItems: "center",
                                                  color: COLORS.primary,
                                                  opacity: 0.8,
                                                  transition: "opacity 0.2s",
                                                }}
                                                onMouseOver={(e) =>
                                                  (e.currentTarget.style.opacity =
                                                    "1")
                                                }
                                                onMouseOut={(e) =>
                                                  (e.currentTarget.style.opacity =
                                                    "0.8")
                                                }
                                                title="Xem bài làm"
                                              >
                                                <svg
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  width="16"
                                                  height="16"
                                                  viewBox="0 0 24 24"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  strokeWidth="2"
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                >
                                                  <path d="M15 3h6v6" />
                                                  <path d="M10 14 21 3" />
                                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                                </svg>
                                              </a>
                                            )}
                                            {attempt.completedAt && (
                                              <span
                                                style={{
                                                  color: COLORS.secondary,
                                                  fontSize: "0.7rem",
                                                }}
                                              >
                                                {format(
                                                  new Date(attempt.completedAt),
                                                  "dd/MM/yyyy HH:mm",
                                                )}
                                              </span>
                                            )}
                                          </div>
                                        ) : (
                                          <span
                                            style={{
                                              color: COLORS.primary,
                                              background: `${COLORS.primary}11`,
                                              padding: "2px 8px",
                                              borderRadius: "12px",
                                              fontSize: "0.75rem",
                                              fontWeight: "700",
                                            }}
                                          >
                                            CHƯA LÀM
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {!classDoc?.students?.length && (
                        <tr>
                          <td
                            colSpan={2}
                            style={{
                              padding: "20px",
                              textAlign: "center",
                              color: COLORS.secondary,
                            }}
                          >
                            Lớp học chưa có học viên.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

const AssignmentSelect = ({ label, value, onChange, options, color }: any) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = options.filter((opt: any) =>
    opt.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div>
      <label
        style={{
          display: "block",
          marginBottom: "6px",
          fontWeight: "700",
          color: "#555",
          fontSize: "0.8rem",
        }}
      >
        {label.toUpperCase()}
      </label>

      {/* Search Input */}
      <div style={{ marginBottom: "8px" }}>
        <input
          type="text"
          placeholder={`Tìm ${label.toLowerCase()}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: "8px",
            border: `1px solid ${color}33`,
            fontSize: "0.8rem",
            outline: "none",
            transition: "all 0.2s",
          }}
          onFocus={(e) => (e.target.style.border = `1px solid ${color}`)}
          onBlur={(e) => (e.target.style.border = `1px solid ${color}33`)}
        />
      </div>

      <div
        style={{
          maxHeight: "150px",
          overflowY: "auto",
          border: `1px solid ${color}33`,
          borderRadius: "8px",
          padding: "6px",
        }}
      >
        {filteredOptions.length > 0 ? (
          filteredOptions.map((opt: any) => {
            const isSelected = value.includes(opt.id);
            return (
              <div
                key={opt.id}
                onClick={() => {
                  if (isSelected)
                    onChange(value.filter((id: any) => id !== opt.id));
                  else onChange([...value, opt.id]);
                }}
                style={{
                  padding: "6px 8px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  marginBottom: "2px",
                  background: isSelected ? `${color}11` : "transparent",
                  color: isSelected ? color : "#444",
                  fontWeight: isSelected ? "700" : "400",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    width: "14px",
                    height: "14px",
                    border: `2px solid ${isSelected ? color : "#ccc"}`,
                    background: isSelected ? color : "transparent",
                    borderRadius: "3px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isSelected && (
                    <svg
                      width="8"
                      height="8"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#fff"
                      strokeWidth="4"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                {opt.title}
                <div
                  style={{
                    marginLeft: "auto",
                    display: "flex",
                    gap: "4px",
                    opacity: 0.8,
                  }}
                >
                  {opt.tests?.map((t: any) => (
                    <span key={t.id || t} title={t.type}>
                      <SkillIcon 
                        skill={typeof t === "object" ? t.type : ""} 
                        size={14} 
                      />
                    </span>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div
            style={{
              padding: "10px",
              textAlign: "center",
              fontSize: "0.75rem",
              color: COLORS.secondary,
            }}
          >
            Không tìm thấy kết quả.
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignmentTool;
