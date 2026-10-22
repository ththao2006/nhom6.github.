
(() => {
  const params = new URLSearchParams(window.location.search);
  const eventId = params.get("id");

  const status = document.getElementById("checkoutStatus");

  if (!eventId) {
    status.textContent = "Bạn chưa chọn sự kiện để đặt vé.";
    return;
  }

  let events = window.TT_SEED_EVENTS || [];

  try {
    const saved = JSON.parse(localStorage.getItem("tt_events"));
    if (Array.isArray(saved)) events = saved;
  } catch (error) {
    console.warn("Không đọc được dữ liệu đã lưu:", error);
  }

  const event = events.find(item => item.id === eventId);

  if (!event) {
    status.textContent = "Không tìm thấy sự kiện.";
    return;
  }

  document.title = "Đặt vé - " + event.title + " | Ticketbox";

  status.textContent = "Bạn đang đặt vé cho: " + event.title;
})();
