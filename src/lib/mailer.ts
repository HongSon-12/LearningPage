export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 60000,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmail = async (to: string, subject: string, html: string) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("Chưa cấu hình SMTP. Bỏ qua gửi email.");
    return false;
  }
  try {
    const info = await transporter.sendMail({
      from: `"TTCC115" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log("Message sent: %s", info.messageId);
    return true;
  } catch {
    console.error("Lỗi gửi email: SMTP_SEND_FAILED");
    return false;
  }
};

export const sendRegistrationConfirmation = async (
  email: string,
  name: string,
  className: string,
  code: string,
  registrationId: string,
) => {
  const subject = `Đã tiếp nhận đăng ký khóa học ${className}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
      <div style="background-color: #2563eb; padding: 20px; text-align: center; color: white;">
        <h2 style="margin: 0;">Xác nhận Đăng ký</h2>
      </div>
      <div style="padding: 24px;">
        <p>Kính gửi <strong>${escapeHtml(name)}</strong>,</p>
        <p>Cảm ơn bạn đã đăng ký khóa học <strong>${escapeHtml(className)}</strong> (Mã lớp: <strong>${escapeHtml(code)}</strong>).</p>
        <p>Mã hồ sơ: <strong>${escapeHtml(registrationId)}</strong>. Lưu mã đăng ký để liên hệ trung tâm. Để xem lịch sử học, nhập CCCD tại trang Tra cứu và xác thực bằng mã gửi đến email trong hồ sơ học viên.</p>
        <p>Hồ sơ của bạn đã được tiếp nhận và đang trong quá trình xử lý.</p>
        <p>Nếu chưa thanh toán học phí, vui lòng hoàn tất thủ tục để được giữ chỗ và ưu tiên xét duyệt.</p>
        <br/>
        <p>Trân trọng,<br/><strong>Trung tâm Cấp cứu 115</strong></p>
      </div>
    </div>
  `;
  return sendEmail(email, subject, html);
};

export const sendInvoiceEmail = async (
  email: string,
  name: string,
  invoiceCode: string,
) => {
  const subject = `Thông báo xuất Hóa đơn điện tử`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
      <div style="background-color: #2563eb; padding: 20px; text-align: center; color: white;">
        <h2 style="margin: 0;">Hóa đơn Điện tử</h2>
      </div>
      <div style="padding: 24px;">
        <p>Kính gửi <strong>${escapeHtml(name)}</strong>,</p>
        <p>Trung tâm đã xuất Hóa đơn điện tử cho khoản thanh toán học phí của bạn.</p>
        <div style="background-color: #f3f4f6; padding: 12px; border-radius: 8px; font-size: 18px; text-align: center; margin: 20px 0;">
          Mã tra cứu HĐĐT: <strong>${escapeHtml(invoiceCode)}</strong>
        </div>
        <p>Vui lòng sử dụng mã trên để tra cứu trên cổng thông tin hóa đơn điện tử.</p>
        <br/>
        <p>Trân trọng,<br/><strong>Trung tâm Cấp cứu 115</strong></p>
      </div>
    </div>
  `;
  return sendEmail(email, subject, html);
};

export const sendReminderEmail = async (
  email: string,
  name: string,
  className: string,
  startDate: Date,
) => {
  const subject = `Nhắc nhở tham gia khóa học ${className}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
      <div style="background-color: #f59e0b; padding: 20px; text-align: center; color: white;">
        <h2 style="margin: 0;">Nhắc nhở Tham gia Khóa học</h2>
      </div>
      <div style="padding: 24px;">
        <p>Kính gửi <strong>${escapeHtml(name)}</strong>,</p>
        <p>Đây là email nhắc nhở khóa học <strong>${escapeHtml(className)}</strong> của bạn sẽ bắt đầu vào ngày <strong>${new Date(startDate).toLocaleDateString("vi-VN")}</strong>.</p>
        <p>Vui lòng chuẩn bị và sắp xếp thời gian tham gia đầy đủ để đảm bảo điều kiện cấp chứng chỉ.</p>
        <br/>
        <p>Trân trọng,<br/><strong>Trung tâm Cấp cứu 115</strong></p>
      </div>
    </div>
  `;
  return sendEmail(email, subject, html);
};

export const sendCertificateEmail = async (
  email: string,
  name: string,
  certCode: string,
  searchLink: string,
) => {
  const subject = `Thông báo cấp Chứng chỉ / Giấy xác nhận`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
      <div style="background-color: #10b981; padding: 20px; text-align: center; color: white;">
        <h2 style="margin: 0;">Chúc mừng bạn đã hoàn thành khóa học!</h2>
      </div>
      <div style="padding: 24px;">
        <p>Kính gửi <strong>${escapeHtml(name)}</strong>,</p>
        <p>Trung tâm thông báo bạn đã hoàn thành xuất sắc khóa học và được cấp chứng chỉ / giấy xác nhận.</p>
        <div style="background-color: #f3f4f6; padding: 12px; border-radius: 8px; font-size: 18px; text-align: center; margin: 20px 0;">
          Số chứng chỉ: <strong>${escapeHtml(certCode)}</strong>
        </div>
        <p>Bạn có thể tra cứu và xác thực chứng chỉ tại địa chỉ sau:</p>
        <p style="text-align: center;">
          <a href="${escapeHtml(searchLink)}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Tra cứu chứng chỉ</a>
        </p>
        <br/>
        <p>Trân trọng,<br/><strong>Trung tâm Cấp cứu 115</strong></p>
      </div>
    </div>
  `;
  return sendEmail(email, subject, html);
};

// Security lookup delivery must fail visibly so the outbox can retry. Never log SMTP payloads or links.
export async function sendSecurityEmail(
  to: string,
  subject: string,
  html: string,
) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS)
    throw new Error("SMTP_NOT_CONFIGURED");
  try {
    await transporter.sendMail({
      from: `"TTCC115" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
  } catch {
    throw new Error("SMTP_SEND_FAILED");
  }
}
