export class RequestError extends Error {
  constructor(message:string,public status=400){super(message);this.name="RequestError";}
}
export function publicError(error:unknown,fallback="Không thể xử lý yêu cầu. Vui lòng thử lại."){
  if(error instanceof RequestError)return error.message;
  const code=error && typeof error==="object" && "code" in error ? String(error.code) : "";
  if(code==="P2002")return "Thông tin này đã tồn tại. Vui lòng kiểm tra và thử lại.";
  if(code==="P2003")return "Dữ liệu đang được sử dụng nên chưa thể thay đổi hoặc xóa.";
  if(code==="P2025")return "Không tìm thấy dữ liệu hoặc dữ liệu đã thay đổi. Vui lòng tải lại trang.";
  if(["P2034","P2028"].includes(code))return "Dữ liệu vừa thay đổi hoặc hệ thống đang bận. Vui lòng tải lại rồi thử lại.";
  if(process.env.NODE_ENV==="development" && error instanceof Error){console.error(error);return `${fallback} Chi tiết dev: ${error.name}: ${error.message}`;}
  // Production responses never echo SQL, paths, service configuration or an unexpected error message.
  return fallback;
}
