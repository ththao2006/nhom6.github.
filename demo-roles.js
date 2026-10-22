
(() => {
  "use strict";

  const USERS = {
    organizer: {
      id: "organizer-demo",
      name: "Minh Anh — Organizer",
      email: "organizer@ticketbox.demo",
      role: "organizer"
    },

    admin: {
      id: "admin-demo",
      name: "Ticketbox Admin",
      email: "admin@ticketbox.demo",
      role: "admin"
    }
  };

  const labels = {
    organizer: "Ban tổ chức",
    admin: "Quản trị viên"
  };

  function getStaff() {
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

  const header = document.querySelector(".header-actions");

  if (!header) return;

  const wrap = document.createElement("div");
  wrap.className = "demo-role-wrap";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "demo-role-button";
  button.setAttribute("aria-expanded", "false");

  const menu = document.createElement("div");
  menu.className = "demo-role-menu";
  menu.hidden = true;

  function updateButton() {
    const staff = getStaff();

    button.textContent =
      "🎭 " +
      (labels[staff?.role] || "Vai trò demo") +
      " ▾";

    menu.querySelectorAll("[data-role]").forEach(item => {
      item.classList.toggle(
        "selected",
        item.dataset.role === staff?.role
      );
    });
  }

  Object.keys(USERS).forEach(role => {
    const item = document.createElement("button");

    item.type = "button";
    item.dataset.role = role;
    item.textContent = labels[role];

    item.addEventListener("click", () => {
      // Vai trò quản lý dùng tài khoản demo riêng.
      localStorage.setItem(
        "tt_user",
        JSON.stringify(USERS[role])
      );

      // Không cho phiên khách hàng eKYC bị trộn với
      // phiên quản lý khi đang trình diễn.
      window.TT_AUTH?.logout();

      location.reload();
    });

    menu.appendChild(item);
  });

  const customerItem = document.createElement("button");
  customerItem.type = "button";
  customerItem.textContent = "Khách hàng (eKYC) →";

  customerItem.addEventListener("click", () => {
    localStorage.removeItem("tt_user");

    location.href =
      "auth.html?return=" +
      encodeURIComponent("index.html#home");
  });

  menu.appendChild(customerItem);

  const staff = getStaff();

  if (staff) {
    const exitItem = document.createElement("button");
    exitItem.type = "button";
    exitItem.textContent = "Thoát vai trò demo";

    exitItem.addEventListener("click", () => {
      localStorage.removeItem("tt_user");
      location.reload();
    });

    menu.appendChild(exitItem);
  }

  wrap.append(button, menu);

  const accountButton =
    document.getElementById("accountButton");

  header.insertBefore(wrap, accountButton);

  button.addEventListener("click", () => {
    menu.hidden = !menu.hidden;

    button.setAttribute(
      "aria-expanded",
      String(!menu.hidden)
    );
  });

  document.addEventListener("click", event => {
    if (!wrap.contains(event.target)) {
      menu.hidden = true;
      button.setAttribute("aria-expanded", "false");
    }
  });

  const style = document.createElement("style");

  style.textContent = `
    .demo-role-wrap {
      position: relative;
      z-index: 200;
      flex-shrink: 0;
    }

    .demo-role-button {
      background: #153123;
      color: #b8ff35;
      border: 1px solid #4b7652;
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
    }

    .demo-role-menu {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 210px;
      background: #171e29;
      border: 1px solid #334638;
      border-radius: 12px;
      padding: 6px;
      box-shadow: 0 15px 35px #0006;
    }

    .demo-role-menu[hidden] {
      display: none;
    }

    .demo-role-menu button {
      display: block;
      width: 100%;
      text-align: left;
      background: transparent;
      color: white;
      border: 0;
      border-radius: 7px;
      padding: 11px;
      cursor: pointer;
    }

    .demo-role-menu button:hover,
    .demo-role-menu button.selected {
      background: #2a4632;
      color: #b8ff35;
    }

    @media (max-width: 800px) {
      .demo-role-button {
        padding: 8px;
        font-size: 12px;
      }
    }
  `;

  document.head.appendChild(style);
  updateButton();

  // Liên kết dashboard riêng của Ban tổ chức.
  document.querySelectorAll(
    'a[href="#organizer-dashboard"]'
  ).forEach(link => {
    link.addEventListener("click", event => {
      const role = getStaff()?.role;

      if (role === "organizer" || role === "admin") {
        event.preventDefault();
        event.stopImmediatePropagation();

        location.href = "organizer.html";
      }
    }, true);
  });
})();
