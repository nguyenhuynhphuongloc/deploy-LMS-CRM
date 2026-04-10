"use client";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Phase = "week3" | "week8";

type FeedbackComment = {
  studentId?: string;
  studentName?: string;
  teacherId?: string;
  teacherName?: string;
  createdAt?: string;
  comment?: string;
};

interface FeedbackHeaderData {
  studentName: string;
  studentId: string;
  className: string;
  courseName: string;
}

export default function FeedbackForm() {
  const searchParams = useSearchParams();

  const studentId = searchParams.get("student") ?? "";

  const classId = searchParams.get("classId") ?? "";

  const phase = (searchParams.get("phase") as Phase) || "week3";

  const classNameParam = searchParams.get("class") ?? "";

  const courseNameParam = searchParams.get("courseName") ?? "";

  const studentNameParam = searchParams.get("studentName") ?? "";
  const teacherNameParam = searchParams.get("teacherName") ?? "";

  const [loading, setLoading] = useState(true);

  const [header, setHeader] = useState<FeedbackHeaderData | null>(null);

  const [comments, setComments] = useState<FeedbackComment[]>([]);

  const [error, setError] = useState<string | null>(null);

  const pdfRef = useRef<HTMLDivElement>(null);

  const formatDateDDMMYYYY = (iso?: string) => {
    if (!iso) return "";

    const d = new Date(iso);

    if (Number.isNaN(d.getTime())) return "";

    const dd = String(d.getDate()).padStart(2, "0");

    const mm = String(d.getMonth() + 1).padStart(2, "0");

    const yyyy = d.getFullYear();

    return `${dd}-${mm}-${yyyy}`;
  };

  const handleDownloadPDF = async () => {
    const element = pdfRef.current;
    if (!element) return;

    try {
      const imgs = Array.from(element.querySelectorAll("img"));

      await Promise.all(
        imgs.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((res) => {
                img.onload = () => res();
                img.onerror = () => res();
              }),
        ),
      );

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: element.offsetWidth,
        height: element.scrollHeight,
        windowWidth: element.offsetWidth,
        windowHeight: element.scrollHeight,
      });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const margin = 10;
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2;

      const scaleW = maxWidth / canvas.width;
      const scaleH = maxHeight / canvas.height;
      const scale = Math.min(scaleW, scaleH);

      const finalWidth = canvas.width * scale;
      const finalHeight = canvas.height * scale;

      const x = (pageWidth - finalWidth) / 2;
      const y = (pageHeight - finalHeight) / 2;

      pdf.addImage(imgData, "PNG", x, y, finalWidth, finalHeight);

      const safeName = (header?.studentName ?? "feedback").replaceAll(" ", "_");
      pdf.save(`${safeName}_${phase}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Không thể xuất PDF. Vui lòng thử lại.");
    }
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!studentId || !classId) {
          setError("Thiếu query params: student hoặc classId");
          setHeader(null);
          setComments([]);
          return;
        }

        const fbRes = await fetch(
          `/api/feedback?where[class][equals]=${classId}&limit=100&depth=0`,
          { credentials: "include" },
        );

        if (!fbRes.ok) throw new Error("Không lấy được dữ liệu feedback");

        const fbJson = await fbRes.json();

        const docs = fbJson?.docs ?? [];

        const merged: Record<
          string,
          { week3?: FeedbackComment[]; week8?: FeedbackComment[] }
        > = {};

        for (const d of docs) {
          const fd = d?.feedback_data ?? {};

          for (const sid of Object.keys(fd)) {
            merged[sid] = merged[sid] ?? {};

            const s = fd?.[sid] ?? {};
            const w3 = Array.isArray(s.week3) ? s.week3 : [];
            const w8 = Array.isArray(s.week8) ? s.week8 : [];

            merged[sid].week3 = [...(merged[sid].week3 ?? []), ...w3];
            merged[sid].week8 = [...(merged[sid].week8 ?? []), ...w8];
          }
        }

        const list = (merged?.[studentId]?.[phase] ?? []) as FeedbackComment[];

        const sorted = list
          .slice()
          .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

        setComments(sorted);

        const resolvedStudentName =
          sorted?.[0]?.studentName || studentNameParam || "Chưa có tên";

        setHeader({
          studentName: resolvedStudentName,
          studentId,
          className: classNameParam,
          courseName: courseNameParam,
        });
      } catch (e: any) {
        setError(e?.message || "Đã có lỗi");
        setHeader(null);
        setComments([]);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [
    studentId,
    classId,
    phase,
    classNameParam,
    courseNameParam,
    studentNameParam,
  ]);

  if (loading) return <div className="p-6">Đang tải...</div>;

  if (error) return <div className="p-6 text-red-600">{error}</div>;

  if (!header) return <div className="p-6">Không có dữ liệu</div>;

  const teacherNames =
    Array.from(
      new Set(comments.map((c) => c.teacherName).filter(Boolean)),
    ).join(", ") || teacherNameParam;

  const latestDate = comments?.[0]?.createdAt;

  return (
    <div className="flex flex-col items-center p-2 bg-gray-100 min-h-screen mt-10">
      <div
        ref={pdfRef}
        className="w-[1000px] bg-white border-2 border-slate-300"
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-6 border-b-[35px] border-red-700 pb-6">
            <span className="text-red-700 font-bold text-3xl uppercase whitespace-nowrap mt-4 ">
              ĐÁNH GIÁ VÀ NHẬN XÉT {phase === "week3" ? "TUẦN 3" : "TUẦN 8"}
            </span>

            <div className="mt-4">
              <Image
                src="/logo.svg"
                alt="TUTORS"
                width={150}
                height={50}
                className="object-contain"
                unoptimized
              />
            </div>
          </div>

          <div className="flex justify-between items-center gap-x-12 gap-y-4 px-4 mb-2 md:mb-6 text-sm mt-4">
            <div className="flex items-center  border-gray-600">
              <span className="font-bold text-xl">Học sinh: </span>
              <span className="text-black text-xl ml-2">
                {header.studentName}
              </span>
            </div>

            <div className="flex items-center  border-gray-600">
              <span className="font-bold text-xl ">Lớp: </span>
              <span className="text-black text-xl ml-2">
                {header.className}
              </span>
            </div>
          </div>

          <div className="p-4 space-y-4 text-[15px]">
            {comments.length === 0 ? (
              <div>Chưa có nhận xét</div>
            ) : (
              comments.map((c, i) => (
                <div
                  key={i}
                  className="border rounded p-3 border-gray-400 text-xl"
                >
                  <div className="font-semibold">
                    Giáo viên:{" "}
                    <span className="text-red-600">
                      {c.teacherName ?? "Giáo viên"}{" "}
                    </span>
                  </div>
                  <div className="mt-2 whitespace-pre-wrap">
                    {(c.comment ?? "")
                      .split("\n")
                      .filter((line) => line.trim())
                      .map((line, idx) => (
                        <div key={idx} className="whitespace-pre-wrap">
                          - {line}
                        </div>
                      ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-2 flex flex-col items-end mr-6">
            <div className="font-bold text-lg font-sans tracking-normal text-red-800 ">
              <span className="text-black font-sans uppercase text-xl">
                Phòng học vụ
              </span>{" "}
            </div>
            <Image
              src="/hoc_vu.png"
              alt="Phòng học vụ"
              width={180}
              height={50}
              className="object-contain"
              unoptimized
            />
            <div className="font-bold text-lg font-sans tracking-normal text-red-800 ">
              <span className="text-black font-sans uppercase text-xl">
                Ngày:
              </span>{" "}
              <span className="text-xl">{formatDateDDMMYYYY(latestDate)}</span>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleDownloadPDF}
        className="mt-6 px-6 py-2 bg-red-900 text-white font-bold rounded hover:bg-red-700"
      >
        Download PDF
      </button>
    </div>
  );
}
