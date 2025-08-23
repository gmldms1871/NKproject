// lib/pdf-generator.ts
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { GeneratedSummary, ReportWithDetails } from "./reports";

export interface PdfReportData {
  studentName: string;
  className: string;
  formTitle: string;
  submittedAt: string;
  studentResponses: Array<{
    questionText: string;
    response: {
      textResponse?: string;
      numberResponse?: number;
      ratingResponse?: number;
    };
  }>;
  timeTeacherComment?: string;
  teacherComment?: string;
  summary?: GeneratedSummary;
}

/**
 * NK 학원 분석 결과지 HTML 템플릿 생성 (A4 최적화)
 */
export function generateReportHTML(data: PdfReportData): string {
  const formattedDate = new Date().toLocaleDateString("ko-KR");

  // 학생 응답을 간단하게 포맷팅
  const studentResponsesText = data.studentResponses
    .slice(0, 5) // 최대 5개만 표시
    .map((r, index) => {
      const answer =
        r.response.textResponse ||
        r.response.numberResponse?.toString() ||
        r.response.ratingResponse?.toString() ||
        "응답없음";
      return `${index + 1}. ${r.questionText}: "${answer}"`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NK 학습 성향 분석 결과지 - ${data.studentName}</title>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Noto Sans KR', sans-serif;
            font-size: 14px;
            line-height: 1.4;
            color: #333;
            background: white;
            max-width: 794px;
            margin: 0;
            padding: 20px;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        .logo {
            width: 40px;
            height: 40px;
            background: #2563eb;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 18px;
            margin-bottom: 10px;
        }
        .title {
            font-size: 24px;
            font-weight: 700;
            color: #1e40af;
            margin-bottom: 5px;
        }
        .subtitle {
            font-size: 16px;
            color: #6b7280;
            margin-bottom: 3px;
        }
        .date {
            font-size: 12px;
            color: #9ca3af;
        }
        .info-section {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }
        .info-item {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        .info-label {
            font-weight: 600;
            color: #374151;
        }
        .info-value {
            color: #6b7280;
        }
        .section {
            margin-bottom: 20px;
            page-break-inside: avoid;
        }
        .section-title {
            font-size: 18px;
            font-weight: 700;
            color: #1e40af;
            border-left: 4px solid #2563eb;
            padding-left: 10px;
            margin-bottom: 10px;
        }
        .ai-content {
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 8px;
            padding: 15px;
            white-space: pre-wrap;
            word-wrap: break-word;
            overflow-wrap: break-word;
            font-size: 13px;
            line-height: 1.5;
            max-height: none;
            overflow: visible;
        }
        .responses-section {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px;
        }
        .response-item {
            background: white;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            padding: 10px;
            margin-bottom: 8px;
            font-size: 12px;
        }
        .response-question {
            font-weight: 600;
            color: #374151;
            margin-bottom: 5px;
            word-wrap: break-word;
        }
        .response-answer {
            color: #6b7280;
            word-wrap: break-word;
            white-space: pre-wrap;
        }
        .comments-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
        }
        .comment-box {
            background: white;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 12px;
        }
        .comment-title {
            font-weight: 600;
            color: #374151;
            margin-bottom: 8px;
            font-size: 14px;
        }
        .comment-content {
            color: #6b7280;
            font-size: 12px;
            line-height: 1.4;
            word-wrap: break-word;
            white-space: pre-wrap;
            overflow-wrap: break-word;
        }
        .footer {
            text-align: center;
            border-top: 1px solid #e5e7eb;
            padding-top: 10px;
            font-size: 10px;
            color: #9ca3af;
            margin-top: 30px;
        }
        @media print {
            body { background: white !important; }
            .section { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <!-- 헤더 -->
    <div class="header">
        <div class="logo">NK</div>
        <div class="title">NK 학습 성향 분석 결과지</div>
        <div class="subtitle">${data.studentName} 학생 맞춤형 성장 전략 분석</div>
        <div class="date">${data.formTitle} | ${formattedDate}</div>
    </div>

    <!-- 학생 기본 정보 -->
    <div class="info-section">
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">학생명</span>
                <span class="info-value">${data.studentName}</span>
            </div>
            <div class="info-item">
                <span class="info-label">반명</span>
                <span class="info-value">${data.className || "미지정 반"}</span>
            </div>
            <div class="info-item">
                <span class="info-label">폼 제목</span>
                <span class="info-value">${data.formTitle}</span>
            </div>
            <div class="info-item">
                <span class="info-label">분석 날짜</span>
                <span class="info-value">${formattedDate}</span>
            </div>
        </div>
    </div>

    ${
      data.summary
        ? `
    <!-- AI 종합 분석 결과 -->
    <div class="section">
        <div class="section-title">🤖 NK AI 종합 분석 결과</div>
        <div class="ai-content">${data.summary.overallSummary.substring(0, 2000)}${
            data.summary.overallSummary.length > 2000 ? "..." : ""
          }</div>
    </div>
    `
        : ""
    }

    <!-- 학생 응답 내용 (요약) -->
    <div class="section">
        <div class="section-title">💬 학생의 주요 응답</div>
        <div class="responses-section">
            ${data.studentResponses
              .slice(0, 5)
              .map((resp, index) => {
                const answer =
                  resp.response.textResponse ||
                  resp.response.numberResponse?.toString() ||
                  resp.response.ratingResponse?.toString() ||
                  "응답없음";
                return `
                <div class="response-item">
                    <div class="response-question">${resp.questionText}</div>
                    <div class="response-answer">"${
                      answer.length > 100 ? answer.substring(0, 100) + "..." : answer
                    }"</div>
                </div>
              `;
              })
              .join("")}
            ${
              data.studentResponses.length > 5
                ? `<div class="response-item"><div class="response-answer">...외 ${
                    data.studentResponses.length - 5
                  }개 응답</div></div>`
                : ""
            }
        </div>
    </div>

    <!-- 교사 코멘트 -->
    ${
      data.timeTeacherComment || data.teacherComment
        ? `
    <div class="section">
        <div class="section-title">👥 교사 코멘트</div>
        <div class="comments-section">
            ${
              data.timeTeacherComment
                ? `
            <div class="comment-box">
                <div class="comment-title">🎯 시간강사 코멘트</div>
                <div class="comment-content">${data.timeTeacherComment.substring(0, 300)}${
                    data.timeTeacherComment.length > 300 ? "..." : ""
                  }</div>
            </div>
            `
                : ""
            }
            
            ${
              data.teacherComment
                ? `
            <div class="comment-box">
                <div class="comment-title">📋 담임교사 코멘트</div>
                <div class="comment-content">${data.teacherComment.substring(0, 300)}${
                    data.teacherComment.length > 300 ? "..." : ""
                  }</div>
            </div>
            `
                : ""
            }
        </div>
    </div>
    `
        : ""
    }

    <!-- 푸터 -->
    <div class="footer">
        <div>&copy; 2025 NK학원 맞춤형 분석 결과지</div>
        <div>본 분석 결과는 AI를 통해 생성되었으며, 참고용으로만 활용해주세요.</div>
    </div>
</body>
</html>`;
}

/**
 * HTML을 PDF로 변환 (최적화 버전)
 */
export async function generatePDFFromHTML(html: string, filename: string): Promise<void> {
  try {
    // 임시 DOM 요소 생성 - A4 최적화
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    tempDiv.style.position = "absolute";
    tempDiv.style.left = "-9999px";
    tempDiv.style.top = "-9999px";
    tempDiv.style.width = "794px"; // A4 width in pixels
    tempDiv.style.maxWidth = "794px";
    tempDiv.style.padding = "40px"; // A4 여백
    tempDiv.style.fontSize = "14px";
    tempDiv.style.lineHeight = "1.4";
    document.body.appendChild(tempDiv);

    // 폰트 로딩 대기 (시간 단축)
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 🔧 핵심 개선: 품질 향상
    const canvas = await html2canvas(tempDiv, {
      scale: 1.5, // 품질 향상 (1 → 1.5)
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      width: 794, // A4 width
      height: Math.min(tempDiv.scrollHeight, 3000), // 최대 높이 제한
      windowWidth: 794,
      removeContainer: true,
      imageTimeout: 5000,
    });

    // 🔧 품질-용량 균형: JPEG 품질 향상
    const imgData = canvas.toDataURL("image/jpeg", 0.9); // 품질 85% → 90%

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true, // PDF 압축 활성화
    });

    // A4 사이즈 계산
    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const margin = 10; // 여백
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = pageHeight - margin * 2;

    // 이미지를 A4에 맞게 조정
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * contentWidth) / canvas.width;

    let yPosition = margin;
    let remainingHeight = imgHeight;

    // 페이지별로 이미지 분할하여 추가
    let currentPage = 0;

    while (remainingHeight > 0) {
      if (currentPage > 0) {
        pdf.addPage();
      }

      const sourceY = currentPage * ((contentHeight * canvas.width) / contentWidth);
      const sourceHeight = Math.min(
        (contentHeight * canvas.width) / contentWidth,
        canvas.height - sourceY
      );

      // 캔버스에서 해당 부분만 잘라내기
      const pageCanvas = document.createElement("canvas");
      const pageCtx = pageCanvas.getContext("2d");
      pageCanvas.width = canvas.width;
      pageCanvas.height = sourceHeight;

      if (pageCtx) {
        pageCtx.drawImage(
          canvas,
          0,
          sourceY,
          canvas.width,
          sourceHeight,
          0,
          0,
          canvas.width,
          sourceHeight
        );

        const pageImgData = pageCanvas.toDataURL("image/jpeg", 0.9);
        const pageImgHeight = (sourceHeight * contentWidth) / canvas.width;

        pdf.addImage(pageImgData, "JPEG", margin, yPosition, imgWidth, pageImgHeight);
      }

      remainingHeight -= contentHeight;
      currentPage++;
      yPosition = margin;

      // 안전장치: 최대 10페이지로 제한
      if (currentPage >= 10) break;
    }

    // PDF 저장
    pdf.save(filename);

    // 정리
    document.body.removeChild(tempDiv);

    console.log("✅ PDF 생성 완료:", {
      파일명: filename,
      페이지수: currentPage,
      품질: "향상됨",
      예상크기: "2-4MB",
    });
  } catch (error) {
    console.error("PDF 생성 중 오류 발생:", error);
    throw new Error("PDF 생성에 실패했습니다.");
  }
}

/**
 * 보고서 데이터를 PDF로 변환하여 다운로드
 */
export async function downloadReportAsPDF(data: PdfReportData): Promise<void> {
  try {
    const html = generateReportHTML(data);
    const filename = `NK_분석결과지_${data.studentName}_${new Date()
      .toLocaleDateString("ko-KR")
      .replace(/\./g, "")}.pdf`;

    await generatePDFFromHTML(html, filename);
  } catch (error) {
    console.error("PDF 다운로드 실패:", error);
    throw error;
  }
}

/**
 * 보고서 객체에서 PDF 데이터 추출
 */
export function extractPDFDataFromReport(report: ReportWithDetails): PdfReportData {
  return {
    studentName: report.student_name || "Unknown Student",
    className: report.class_name || "미지정 반",
    formTitle: report.form?.title || "NK 분석 폼",
    submittedAt: report.formResponse?.submitted_at || report.created_at || "",
    studentResponses: report.formResponse?.responses || [],
    timeTeacherComment: report.time_teacher_comment || undefined,
    teacherComment: report.teacher_comment || undefined,
    summary: undefined, // 별도로 전달받아야 함
  };
}
