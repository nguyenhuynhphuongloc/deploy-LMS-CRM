import { Payload } from "payload";

import { VIOLATION_RULES, VIOLATION_LABELS, ViolationType } from "../constants/violationRules";

const VIOLATIONS = Object.keys(VIOLATION_RULES) as ViolationType[];

export const calculateStudentViolations = async (
  payload: Payload,
  studentId: string,
  req?: any,
): Promise<Record<ViolationType, number>> => {
  let page = 1;
  let hasNextPage = true;
  const violationCounts: Record<ViolationType, number> = {
    no_camera: 0,
    absent_without_permission: 0,
    late_homework: 0,
  };

  while (hasNextPage) {
    const result = await payload.find({
      req,
      collection: "attendanceRecords",
      limit: 100,
      page,
      depth: 0,
      overrideAccess: true,
    });

    for (const record of result.docs) {
      const violationData = (record as any).ViolationRecord_data;
      if (!violationData) continue;

      Object.values(violationData).forEach((session: any) => {
        const studentViolations = session?.students?.[studentId];
        if (!studentViolations) return;

        VIOLATIONS.forEach((v) => {
          if (studentViolations[v]) {
            violationCounts[v]++;
          }
        });
      });
    }

    hasNextPage = result.hasNextPage;
    page++;
  }

  return violationCounts;
};

export const checkAndSendViolationWarning = async (
  payload: Payload,
  studentId: string,
  req?: any,
) => {
  console.log(`[ViolationCheck] Starting check for studentId: ${studentId}`);

  const student = await payload.findByID({
    req,
    collection: "users",
    id: studentId,
    depth: 1,
    overrideAccess: true,
  });

  if (!student) {
    console.error(`[ViolationCheck] Student with ID ${studentId} not found`);
    return;
  }

  // Tối ưu hóa: Bỏ qua và không chạy đếm lỗi đối với học sinh "Hủy cam kết"
  if (student.violationStatus === "terminated") {
    console.log(`[ViolationCheck] Student ${student.username || studentId} is already terminated. Skipping check.`);
    return;
  }

  // Fetch settings from Global
  let settings: any = {};
  try {
    settings = await payload.findGlobal({
      req,
      slug: "violation-rules",
      overrideAccess: true,
    });
  } catch (error) {
    console.warn("[ViolationCheck] Failed to fetch violation-rules global, using defaults");
  }

  const violationCounts = await calculateStudentViolations(payload, studentId, req);
  console.log(`[ViolationCheck] Violation counts for ${studentId}:`, violationCounts);

  // Define threshold mapper for easy access
  const getThreshold = (type: ViolationType, level: "warning_1" | "warning_2" | "terminated") => {
    const fieldSuffix = level === "warning_1" ? "_threshold" : `_${level}`;
    const value = settings[`${type}${fieldSuffix}`] || VIOLATION_RULES[type] * (level === "warning_2" ? 1.5 : level === "terminated" ? 2 : 1);
    return Math.floor(value);
  };

  const currentStatus = student.violationStatus || "none";
  const statusOrder = ["none", "warning_1", "warning_2", "terminated"];
  const currentIndex = statusOrder.indexOf(currentStatus);

  let newStatus: "warning_1" | "warning_2" | "terminated" | "none" = "none";

  // Determine the highest status reached
  for (const v of VIOLATIONS) {
    const count = violationCounts[v];
    const t1 = getThreshold(v, "warning_1");
    const t2 = getThreshold(v, "warning_2");
    const t3 = getThreshold(v, "terminated");

    if (count >= t3) {
      if (statusOrder.indexOf("terminated") > statusOrder.indexOf(newStatus)) newStatus = "terminated";
    } else if (count >= t2) {
      if (statusOrder.indexOf("warning_2") > statusOrder.indexOf(newStatus)) newStatus = "warning_2";
    } else if (count >= t1) {
      if (statusOrder.indexOf("warning_1") > statusOrder.indexOf(newStatus)) newStatus = "warning_1";
    }
  }

  console.log(`[ViolationCheck] Evaluation for ${student.username || student.email}: Current=${currentStatus}, Calculated=${newStatus}`);

  // Always sync status if it changed (e.g., violations decreased or increased)
  if (newStatus !== currentStatus) {
    console.log(`[ViolationCheck] ATTEMPTING STATUS UPDATE for student ${student.username || studentId} to ${newStatus}`);

    // Update student status
    try {
      await payload.update({
        req,
        collection: "users",
        id: studentId,
        data: {
          violationStatus: newStatus,
        },
        overrideAccess: true,
      });
      console.log(`[ViolationCheck] DATABASE UPDATE SUCCESSFUL.`);
    } catch (err) {
      console.error(`[ViolationCheck] DATABASE UPDATE FAILED:`, err);
      // Even if DB fails, continue to potentially send the email if it escalated
    }
  }

  // Only send warnings if the status has progressed to a MORE SEVERE one
  if (statusOrder.indexOf(newStatus) > currentIndex) {
    console.log(`[ViolationCheck] ESCALATION DETECTED, PREPARING EMAIL to ${newStatus}`);

    // Prepare Email Variables
    let levelText = "";
    let defaultSubject = "";

    if (newStatus === "warning_1") {
      defaultSubject = "CẢNH BÁO VI PHẠM LẦN 1 - ITTS";
      levelText = "Cảnh báo lần 1";
    } else if (newStatus === "warning_2") {
      defaultSubject = "CẢNH BÁO VI PHẠM LẦN 2 - ITTS";
      levelText = "Cảnh báo lần 2 (NGHIÊM TRỌNG)";
    } else if (newStatus === "terminated") {
      defaultSubject = "THÔNG BÁO BUỘC THÔI HỌC - ITTS";
      levelText = "Hủy cam kết học tập";
    }

    let violationListText = "<ul>";
    VIOLATIONS.forEach((v) => {
      const count = violationCounts[v];
      if (count > 0) {
        const t1 = getThreshold(v, "warning_1");
        violationListText += `<li><b>${VIOLATION_LABELS[v]}</b>: ${count} lần (Ngưỡng cảnh báo: ${t1})</li>`;
      }
    });
    violationListText += "</ul>";

    const leadObj = student.lead as any;
    const studentName = leadObj?.fullName || (student as any).fullName || student.username || "Học viên";
    
    let templateNameToSearch = "";
    if (newStatus === "warning_1") templateNameToSearch = "Cảnh báo lần 1";
    if (newStatus === "warning_2") templateNameToSearch = "Cảnh báo lần 2";
    if (newStatus === "terminated") templateNameToSearch = "Hủy cam kết";

    let subject = defaultSubject;
    let htmlContent = `<p>Kính gửi học viên <b>${studentName}</b>,</p><p>Hệ thống ghi nhận bạn đã vi phạm nội quy học tập vượt mức cho phép: <b>${levelText}</b>.</p><p>Chi tiết các lỗi vi phạm hiện tại:</p>${violationListText}<p>Vui lòng liên hệ với bộ phận đào tạo để được giải quyết.</p><p>Trân trọng,<br/>Đội ngũ ITTS.</p>`;

    // Query custom email template
    try {
      const templateResult = await payload.find({
        req,
        collection: "emailTemplates",
        where: { title: { equals: templateNameToSearch } },
        limit: 1,
        depth: 1, // To get the media metadata (URL)
        overrideAccess: true,
      });

      if (templateResult.docs && templateResult.docs.length > 0) {
        const template = templateResult.docs[0] as any;
        subject = template?.subject || subject;
        let customHtml = template?.content || htmlContent;
        
        let imageHtml = "";
        if (template?.image && typeof template.image === "object" && template.image.url) {
          const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || "";
          const imgUrl = template.image.url.startsWith("http") ? template.image.url : baseUrl + template.image.url;
          imageHtml = `<div style="text-align: center; margin-bottom: 20px;"><img src="${imgUrl}" alt="Banner" style="max-width: 100%; border-radius: 8px;" /></div>`;
        }
        
        // Parse variables in subject and content
        subject = subject
          .replace(/{{studentName}}/g, studentName)
          .replace(/{{levelText}}/g, levelText);

        customHtml = customHtml
          .replace(/{{studentName}}/g, studentName)
          .replace(/{{violationList}}/g, violationListText)
          .replace(/{{levelText}}/g, levelText);
          
        // Convert simple newlines to <br/> for plain text formats
        customHtml = customHtml.replace(/\n/g, "<br/>");

        htmlContent = imageHtml + customHtml;
      }
    } catch (err) {
      console.warn("[ViolationCheck] Failed to fetch custom email template, using default fallback", err);
    }

    // Process Emails
    const recipients: string[] = [];
    if (student.email) recipients.push(student.email);

    const lead = student.lead;
    if (lead && typeof lead !== "string" && lead.email) {
      if (!recipients.includes(lead.email)) recipients.push(lead.email);
    }

    if (recipients.length > 0) {
      console.log(`[ViolationCheck] Attempting to send email to: ${recipients.join(", ")}`);
      // LƯU Ý: KHÔNG dùng 'await' ở đây để tách tiến trình gửi Email ra chạy ngầm (Fire-and-forget), 
      // giúp Request không bị treo và nút Lưu phản hồi ngay lập tức.
      payload.sendEmail({
        to: recipients.join(", "),
        subject,
        html: htmlContent,
      })
        .then(() => {
          console.log(`[ViolationCheck] Email sent successfully.`);
        })
        .catch((error) => {
          console.error(`[ViolationCheck] Failed to send email:`, error);
        });
    }
  } else if (newStatus === currentStatus) {
    console.log(`[ViolationCheck] No escalation required for ${student.username || studentId}. Status remains ${newStatus}.`);
  }
};
