
(() => {
  "use strict";

  const form = document.getElementById("checkinForm");
  const input = document.getElementById("qrToken");
  const result = document.getElementById("checkinResult");
  const button = document.getElementById("checkinButton");

  if (!form || !input || !result || !button) return;

  function showResult(message, type) {
    result.className = "result " + type;
    result.textContent = message;
  }

  form.addEventListener("submit", event => {
    event.preventDefault();

    const token = input.value.trim();

    if (!token) {
      showResult("Vui lòng nhập mã QR.", "error");
      return;
    }

    const ticketCore = window.TT_TICKETS;

    if (!ticketCore?.checkIn) {
      showResult(
        "Không tải được hệ thống quản lý vé.",
        "error"
      );
      return;
    }

    const ticket = ticketCore.getAll().find(
      item => item.qrToken === token
    );

    if (!ticket) {
      showResult(
        "❌ QR không hợp lệ hoặc đã bị vô hiệu hóa.",
        "error"
      );
      return;
    }

    if (ticket.status !== "valid") {
      showResult(
        "❌ Vé này đã check-in hoặc không còn hợp lệ.",
        "error"
      );
      return;
    }

    const response = ticketCore.checkIn(token);

    if (!response.ok) {
      showResult(
        "❌ " + response.message,
        "error"
      );
      return;
    }

    showResult(
      "✅ CHECK-IN THÀNH CÔNG!\n" +
      "Sự kiện: " + ticket.eventTitle + "\n" +
      "Loại vé: " + ticket.ticketName + "\n" +
      "Mã vé: " + ticket.id,
      "success"
    );

    result.style.whiteSpace = "pre-line";
    input.value = "";
  });
})();
