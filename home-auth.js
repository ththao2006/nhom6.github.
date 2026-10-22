
(() => {
  "use strict";

  const auth = window.TT_AUTH;
  const accountButton = document.getElementById("accountButton");
  const modalBackdrop = document.getElementById("modalBackdrop");
  const modalContent = document.getElementById("modalContent");
  const modalClose = document.getElementById("modalClose");

  if (!auth || !accountButton) {
    console.error("Thiếu auth.js hoặc accountButton.");
    return;
  }

  const $ = id => document.getElementById(id);

  function currentCustomer() {
    return auth.getCurrentUser();
  }

  function currentStaff() {
    try {
      const user = JSON.parse(
        localStorage.getItem("tt_user") || "null"
      );

      return ["organizer", "admin"].includes(user?.role)
        ? user
        : null;
    } catch {
      return null;
    }
  }

  function closeModal() {
    modalBackdrop?.classList.add("hidden");
    document.body.style.overflow = "";
  }

  function openModal(content) {
    if (!modalBackdrop || !modalContent) return;

    modalContent.replaceChildren();
    modalContent.appendChild(content);
    modalBackdrop.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function addText(parent, tag, value, className) {
    const element = document.createElement(tag);
    element.textContent = value;

    if (className) element.className = className;

    parent.appendChild(element);
    return element;
  }

  function addButton(parent, label, action, secondary = false) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = secondary
      ? "button button-secondary full"
      : "button button-primary full";

    button.textContent = label;
    button.style.marginTop = "12px";
    button.addEventListener("click", action);

    parent.appendChild(button);
    return button;
  }

  function updateHeader() {
    const customer = currentCustomer();
    const staff = currentStaff();

    if (staff) {
      accountButton.textContent = staff.name || "Tài khoản";
    } else if (customer) {
      const firstName = String(customer.name || "")
        .trim()
        .split(/\s+/)
        .slice(-1)[0];

      accountButton.textContent = "👤 " + firstName;
    } else {
      accountButton.textContent = "Đăng nhập / Đăng ký";
    }
  }

  function openAccount() {
    const customer = currentCustomer();
    const staff = currentStaff();

    if (!customer && !staff) {
      location.href = "auth.html?return=" +
        encodeURIComponent("index.html#home");
      return;
    }

    const panel = document.createElement("div");

    addText(panel, "span", "TICKETBOX ACCOUNT", "eyebrow");
    addText(
      panel,
      "h2",
      staff?.name || customer?.name || "Tài khoản"
    );

    addText(
      panel,
      "p",
      staff?.email || customer?.email || ""
    );

    if (staff) {
      addText(
        panel,
        "p",
        staff.role === "admin"
          ? "Vai trò: Quản trị viên (DEMO)"
          : "Vai trò: Ban tổ chức (DEMO)"
      );

      addButton(
        panel,
        staff.role === "admin"
          ? "Mở trang quản trị →"
          : "Quản lý sự kiện →",
        () => {
          location.href = staff.role === "admin"
            ? "admin.html"
            : "organizer.html";
        }
      );
    } else {
      const verified = Boolean(
        customer.verified &&
        customer.verifiedIdentityId
      );

      addText(
        panel,
        "p",
        verified
          ? "✓ Đã xác minh eKYC (DEMO)"
          : "⚠ Chưa xác minh eKYC"
      );

      addButton(
        panel,
        verified
          ? "Xem hồ sơ eKYC →"
          : "Xác minh eKYC bằng camera →",
        () => {
          location.href = "auth.html?return=" +
            encodeURIComponent("index.html#home");
        }
      );

      addButton(
        panel,
        "🎟️ Vé của tôi →",
        () => {
          location.href = "my-tickets.html";
        },
        true
      );
    }

    addButton(
      panel,
      "Đăng xuất",
      () => {
        if (staff) {
          localStorage.removeItem("tt_user");
        } else {
          auth.logout();
        }

        closeModal();
        updateHeader();

        // app.js giữ tài khoản cũ trong biến riêng.
        // Reload để tránh phiên tài khoản không đồng bộ.
        location.reload();
      },
      true
    );

    openModal(panel);
  }

  // Ghi đè hành động đăng nhập cũ từ app.js.
  accountButton.onclick = openAccount;

  // Điều hướng nút "Vé của tôi" sang trang vé thật.
  document.querySelectorAll(
    'a[href="#my-tickets"]'
  ).forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();
      event.stopImmediatePropagation();

      if (!currentCustomer() && !currentStaff()) {
        location.href = "auth.html?return=" +
          encodeURIComponent("my-tickets.html");
        return;
      }

      location.href = "my-tickets.html";
    }, true);
  });

  // Chặn luồng mua vé popup cũ, dùng checkout.js có eKYC.
  // Capture phase giúp chặn handler cũ trong app.js.
  document.addEventListener("click", event => {
    const bookingButton = event.target.closest(
      "[data-book]"
    );

    if (!bookingButton) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const id = bookingButton.dataset.book;

    if (!id) return;

    closeModal();

    location.href =
      "checkout.html?id=" + encodeURIComponent(id);
  }, true);

  // Đồng bộ giao diện khi quay lại từ auth.html.
  window.addEventListener("pageshow", updateHeader);
  window.addEventListener("focus", updateHeader);

  updateHeader();
})();
