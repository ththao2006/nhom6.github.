
(() => {
  const root = document.getElementById("checkoutApp");
  const params = new URLSearchParams(window.location.search);
  const eventId = params.get("id");

  const money = n =>
    new Intl.NumberFormat("vi-VN").format(n) + " đ";

  let events = window.TT_SEED_EVENTS || [];

  try {
    const saved = JSON.parse(localStorage.getItem("tt_events"));
    if (Array.isArray(saved)) events = saved;
  } catch (error) {
    console.warn("Không đọc được dữ liệu sự kiện:", error);
  }

  const event = events.find(e => e.id === eventId);

  if (!event) {
    root.innerHTML = `
      <div class="box">
        <h2>Không tìm thấy sự kiện</h2>
        <a href="index.html">← Về trang chủ</a>
      </div>
    `;
    return;
  }

  document.title = "Đặt vé - " + event.title + " | Ticketbox";

  const ended =
    event.status === "ended" ||
    new Date(event.date + "T23:59:59") < new Date();

  if (ended) {
    root.innerHTML = `
      <div class="box">
        <h2>Sự kiện đã kết thúc</h2>
        <a href="event.html?id=${encodeURIComponent(event.id)}">
          ← Quay lại chi tiết sự kiện
        </a>
      </div>
    `;
    return;
  }

  const ticketTypes = event.ticketTypes || [];
  const selected = {};

  ticketTypes.forEach(t => selected[t.id] = 0);

  root.innerHTML = `
    <div class="layout">
      <div>
        <section class="box">
          <h2>Chọn loại vé</h2>
          <p class="muted" id="eventName"></p>
          <div id="ticketList"></div>
        </section>

        <section class="box">
          <h2>Thông tin người mua</h2>

          <form id="checkoutForm">
            <div class="form-group">
              <label for="buyerName">Họ và tên</label>
              <input id="buyerName" required
                placeholder="Nhập họ tên">
            </div>

            <div class="form-group">
              <label for="buyerEmail">Email</label>
              <input id="buyerEmail" type="email" required
                placeholder="example@gmail.com">
            </div>

            <div class="form-group">
              <label for="buyerPhone">Số điện thoại</label>
              <input id="buyerPhone" type="tel" required
                pattern="[0-9]{10,11}"
                placeholder="Nhập 10–11 chữ số">
            </div>

            <button type="submit" class="button" id="payButton">
              Xác nhận thanh toán demo
            </button>
          </form>
        </section>
      </div>

      <aside>
        <section class="box">
          <h2>Đơn hàng của bạn</h2>
          <div id="orderItems" class="muted">
            Chưa chọn vé
          </div>
          <hr style="border-color:#343944">
          <div class="summary-row">
            <strong>Tổng số vé</strong>
            <span id="totalTickets">0</span>
          </div>
          <div class="summary-row">
            <strong>Tổng thanh toán</strong>
            <span class="total" id="totalPrice">0 đ</span>
          </div>
          <p class="muted" style="font-size:13px">
            Đây là thanh toán mô phỏng.
            Website không thu tiền thật.
          </p>
        </section>
      </aside>
    </div>
  `;

  document.getElementById("eventName").textContent = event.title;

  const ticketList = document.getElementById("ticketList");

  ticketTypes.forEach(ticket => {
    const row = document.createElement("div");
    row.className = "ticket-row";

    const details = document.createElement("div");

    const name = document.createElement("strong");
    name.textContent = ticket.name;

    const price = document.createElement("div");
    price.className = "ticket-price";
    price.textContent = ticket.price === 0
      ? "Miễn phí"
      : money(ticket.price);

    const stock = document.createElement("small");
    stock.className = "muted";
    stock.textContent = "Còn " + ticket.quantity + " vé";

    details.append(name, price, stock);

    const quantity = document.createElement("div");
    quantity.className = "quantity";

    const minus = document.createElement("button");
    minus.type = "button";
    minus.textContent = "−";

    const count = document.createElement("span");
    count.textContent = "0";

    const plus = document.createElement("button");
    plus.type = "button";
    plus.textContent = "+";

    minus.disabled = true;
    plus.disabled = ticket.quantity <= 0;

    minus.addEventListener("click", () => {
      if (selected[ticket.id] > 0) {
        selected[ticket.id]--;
        update();
      }
    });

    plus.addEventListener("click", () => {
      const total = Object.values(selected)
        .reduce((sum, n) => sum + n, 0);

      if (selected[ticket.id] < ticket.quantity && total < 10) {
        selected[ticket.id]++;
        update();
      }
    });

    quantity.append(minus, count, plus);
    row.append(details, quantity);
    ticketList.appendChild(row);

    ticket.controls = { minus, plus, count };
  });

  function update() {
    let totalTickets = 0;
    let totalPrice = 0;
    const orderLines = [];

    ticketTypes.forEach(ticket => {
      const qty = selected[ticket.id];

      totalTickets += qty;
      totalPrice += qty * ticket.price;

      ticket.controls.count.textContent = qty;
      ticket.controls.minus.disabled = qty === 0;

      if (qty > 0) {
        orderLines.push(
          ticket.name + " × " + qty + " — " +
          money(qty * ticket.price)
        );
      }
    });

    ticketTypes.forEach(ticket => {
      ticket.controls.plus.disabled =
        selected[ticket.id] >= ticket.quantity ||
        totalTickets >= 10;
    });

    document.getElementById("totalTickets").textContent = totalTickets;
    document.getElementById("totalPrice").textContent =
      totalPrice === 0 ? "0 đ" : money(totalPrice);

    const items = document.getElementById("orderItems");
    items.replaceChildren();

    if (orderLines.length === 0) {
      items.textContent = "Chưa chọn vé";
    } else {
      orderLines.forEach(line => {
        const p = document.createElement("p");
        p.textContent = line;
        items.appendChild(p);
      });
    }

    document.getElementById("payButton").disabled =
      totalTickets === 0;
  }

  update();

  document.getElementById("checkoutForm")
    .addEventListener("submit", e => {
      e.preventDefault();

      const items = ticketTypes
        .filter(t => selected[t.id] > 0)
        .map(t => ({
          ticketTypeId: t.id,
          name: t.name,
          price: t.price,
          quantity: selected[t.id]
        }));

      if (!items.length) return;

      const buyer = {
        name: document.getElementById("buyerName").value.trim(),
        email: document.getElementById("buyerEmail").value.trim(),
        phone: document.getElementById("buyerPhone").value.trim()
      };

      const total = items.reduce(
        (sum, t) => sum + t.price * t.quantity, 0
      );

      const order = {
        id: "ORD-" + Date.now(),
        eventId: event.id,
        eventTitle: event.title,
        buyer,
        items,
        total,
        status: "paid",
        demo: true,
        createdAt: new Date().toISOString()
      };

      let orders = [];

      try {
        const saved = JSON.parse(localStorage.getItem("tt_orders"));
        if (Array.isArray(saved)) orders = saved;
      } catch {}

      orders.push(order);
      try {
        localStorage.setItem("tt_orders", JSON.stringify(orders));
      } catch (error) {
        alert("Không thể lưu đơn hàng trên trình duyệt này.");
        return;
      }

      root.innerHTML = `
        <div class="box success">
          <h2>✓ Đặt vé demo thành công!</h2>
          <p>Mã đơn hàng: <strong id="orderCode"></strong></p>
          <p>Tổng thanh toán: <strong id="paidTotal"></strong></p>
          <p class="muted">
            Đây là đơn hàng mô phỏng, không có giao dịch tiền thật.
          </p>
          <a href="index.html">← Quay về trang chủ</a>
        </div>
      `;

      document.getElementById("orderCode").textContent = order.id;
      document.getElementById("paidTotal").textContent = money(total);
    });
})();
