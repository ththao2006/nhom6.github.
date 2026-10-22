
(() => {
  "use strict";

  const $ = id => document.getElementById(id);

  const reader = $("reader");
  const cameraBox = $("cameraBox");
  const placeholder = $("cameraPlaceholder");

  const startButton = $("startCamera");
  const stopButton = $("stopCamera");
  const nextButton = $("nextTicket");

  const cameraStatus = $("cameraStatus");
  const result = $("checkinResult");

  const form = $("checkinForm");
  const input = $("qrToken");
  const manualButton = $("checkinButton");

  if (
    !reader ||
    !startButton ||
    !stopButton ||
    !nextButton ||
    !form ||
    !input ||
    !result
  ) {
    return;
  }

  let scanner = null;

  let cameraRunning = false;
  let busy = false;
  let scanLocked = false;

  let lastScannedToken = "";
  let lastScanTime = 0;

  const DUPLICATE_DELAY = 1500;

  function setStatus(message) {
    if (cameraStatus) {
      cameraStatus.textContent = message;
    }
  }

  function showResult(message, type) {
    result.className = "result " + type;
    result.textContent = message;
  }

  function clearResult() {
    result.className = "result";
    result.textContent = "";
  }

  function updateButtons() {
    startButton.disabled = cameraRunning || busy;
    stopButton.disabled = !cameraRunning || busy;

    nextButton.disabled = !scanLocked || busy;

    manualButton.disabled = busy || scanLocked;
  }

  function formatError(error) {
    if (typeof error === "string") {
      return error;
    }

    return error?.message ||
      "Không xác định được nguyên nhân.";
  }

  function normalizeToken(value) {
    const raw = String(value || "").trim();

    // QR hiện tại chứa token thuần.
    // Chỉ xóa khoảng trắng đầu/cuối,
    // không tự sửa nội dung mã.
    return raw;
  }

  function getTicketCore() {
    return window.TT_TICKETS;
  }

  function processToken(rawToken) {
    const token = normalizeToken(rawToken);

    if (!token) {
      showResult(
        "❌ Không đọc được mã QR.",
        "error"
      );
      return false;
    }

    const ticketCore = getTicketCore();

    if (
      !ticketCore?.getAll ||
      !ticketCore?.checkIn
    ) {
      showResult(
        "❌ Không tải được hệ thống quản lý vé.",
        "error"
      );
      return false;
    }

    // Chỉ tìm theo qrToken, không tìm theo id.
    const ticket = ticketCore.getAll().find(
      item => item.qrToken === token
    );

    if (!ticket) {
      showResult(
        "❌ QR không hợp lệ hoặc đã bị vô hiệu hóa.\n" +
        "Hãy kiểm tra đúng trình duyệt đang lưu vé.",
        "error"
      );
      return false;
    }

    if (ticket.status !== "valid") {
      showResult(
        "❌ VÉ ĐÃ ĐƯỢC SỬ DỤNG!\n" +
        "Mã vé: " + ticket.id + "\n" +
        "Không cho phép check-in lần thứ hai.",
        "error"
      );
      return false;
    }

    // ticket-core.js là nơi ghi trạng thái "used".
    const response = ticketCore.checkIn(token);

    if (!response.ok) {
      showResult(
        "❌ " + response.message,
        "error"
      );
      return false;
    }

    showResult(
      "✅ CHECK-IN THÀNH CÔNG!\n" +
      "Sự kiện: " +
        (ticket.eventTitle || "Sự kiện") + "\n" +
      "Loại vé: " +
        (ticket.ticketName || "Vé") + "\n" +
      "Mã vé: " + ticket.id + "\n" +
      "Trạng thái: Đã sử dụng",
      "success"
    );

    return true;
  }

  function handleScannedToken(decodedText) {
    if (
      !cameraRunning ||
      busy ||
      scanLocked
    ) {
      return;
    }

    const token = normalizeToken(decodedText);
    const now = Date.now();

    // Chặn camera báo lặp cùng một QR
    // trong khoảng thời gian rất ngắn.
    if (
      token === lastScannedToken &&
      now - lastScanTime < DUPLICATE_DELAY
    ) {
      return;
    }

    lastScannedToken = token;
    lastScanTime = now;

    // Khóa ngay trước khi xử lý.
    scanLocked = true;

    processToken(token);

    setStatus(
      "Đã xử lý một vé. " +
      "Nhấn 'Quét vé tiếp theo' để tiếp tục."
    );

    updateButtons();
  }

  async function startCamera() {
    if (cameraRunning || busy) return;

    if (typeof Html5Qrcode === "undefined") {
      showResult(
        "❌ Không tải được thư viện quét QR.\n" +
        "Kiểm tra kết nối Internet.",
        "error"
      );
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      showResult(
        "❌ Trình duyệt không hỗ trợ camera " +
        "hoặc trang chưa chạy trên HTTPS.",
        "error"
      );
      return;
    }

    busy = true;
    updateButtons();

    clearResult();
    setStatus("Đang xin quyền truy cập camera...");

    try {
      if (!scanner) {
        scanner = new Html5Qrcode(
          "reader",
          {
            verbose: false
          }
        );
      }

      // Ưu tiên camera sau trên điện thoại.
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (width, height) => {
            const size = Math.min(
              250,
              Math.floor(
                Math.min(width, height) * 0.8
              )
            );

            return {
              width: Math.max(100, size),
              height: Math.max(100, size)
            };
          },
          aspectRatio: 1
        },
        handleScannedToken,
        () => {
          // Bỏ qua các khung hình chưa có QR.
        }
      );

      cameraRunning = true;
      scanLocked = false;

      if (placeholder) {
        placeholder.style.display = "none";
      }

      cameraBox?.classList.add("active");

      setStatus(
        "🟢 Camera đang hoạt động. " +
        "Đưa mã QR vào khung hình."
      );

    } catch (error) {
      cameraRunning = false;

      showResult(
        "❌ Không bật được camera.\n" +
        formatError(error) + "\n" +
        "Kiểm tra quyền camera của trình duyệt.",
        "error"
      );

      setStatus("Camera chưa hoạt động.");

    } finally {
      busy = false;
      updateButtons();
    }
  }

  async function stopCamera() {
    if (!cameraRunning || busy) return;

    busy = true;
    updateButtons();

    setStatus("Đang tắt camera...");

    try {
      await scanner.stop();

      cameraRunning = false;
      scanLocked = false;

      if (placeholder) {
        placeholder.style.display = "";
      }

      cameraBox?.classList.remove("active");

      setStatus("Camera đã tắt.");

    } catch (error) {
      showResult(
        "❌ Không thể tắt camera: " +
        formatError(error),
        "error"
      );

    } finally {
      busy = false;
      updateButtons();
    }
  }

  function nextTicket() {
    if (busy || !scanLocked) return;

    scanLocked = false;

    clearResult();
    input.value = "";

    // Reset chống lặp để có thể nhận
    // bất kỳ QR nào ở lượt tiếp theo.
    lastScannedToken = "";
    lastScanTime = 0;

    if (cameraRunning) {
      setStatus(
        "🟢 Sẵn sàng quét vé tiếp theo."
      );
    } else {
      setStatus(
        "Sẵn sàng. Bật camera để tiếp tục."
      );
    }

    updateButtons();
  }

  form.addEventListener("submit", event => {
    event.preventDefault();

    if (busy || scanLocked) return;

    const token = normalizeToken(input.value);

    if (!token) {
      showResult(
        "❌ Vui lòng nhập mã QR token.",
        "error"
      );
      return;
    }

    scanLocked = true;

    processToken(token);

    setStatus(
      "Đã xử lý vé. " +
      "Nhấn 'Quét vé tiếp theo' để tiếp tục."
    );

    updateButtons();
  });

  startButton.addEventListener(
    "click",
    startCamera
  );

  stopButton.addEventListener(
    "click",
    stopCamera
  );

  nextButton.addEventListener(
    "click",
    nextTicket
  );

  // Khi rời trang, dừng camera.
  window.addEventListener("pagehide", () => {
    if (cameraRunning && scanner) {
      scanner.stop().catch(() => {});
    }
  });

  updateButtons();
})();
