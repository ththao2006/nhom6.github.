
(() => {
  "use strict";

  const KEY = "tt_ticket_units";

  function read(key) {
    try {
      const data = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function save(units) {
    localStorage.setItem(KEY, JSON.stringify(units));
  }

  function makeId() {
    return "TKT-" +
      Date.now().toString(36) + "-" +
      Math.random().toString(36).slice(2, 12);
  }

  function createFromOrder(order) {
    const units = read(KEY);

    // Không tạo vé lần hai cho cùng một đơn hàng.
    if (units.some(unit => unit.orderId === order.id)) {
      return units;
    }

    (order.items || []).forEach((item, itemIndex) => {
      const quantity = Number(item.quantity) || 0;

      for (let unitIndex = 0; unitIndex < quantity; unitIndex++) {
        units.push({
          id: makeId(),
          unitKey: [
            order.id,
            itemIndex,
            unitIndex
          ].join("::"),
          orderId: order.id,
          eventId: order.eventId,
          eventTitle: order.eventTitle,
          ticketTypeId: item.ticketTypeId || item.id,
          ticketName: item.name,
          originalPrice: Number(
            item.originalPrice || item.price
          ),
          ownerUserId: order.buyer?.userId,
          ownerIdentityId:
            order.buyer?.verifiedIdentityId,
          status: "valid",
          qrVersion: 1,
          qrToken: makeId(),
          checkedInAt: null,
          createdAt: new Date().toISOString()
        });
      }
    });

    save(units);
    return units;
  }

  function getAll() {
    return read(KEY);
  }

  function getMine(user) {
    if (!user?.verifiedIdentityId) return [];

    return getAll().filter(unit =>
      unit.ownerUserId === user.id &&
      unit.ownerIdentityId === user.verifiedIdentityId
    );
  }

  function transfer(listing, buyer, buyerOrderId) {
    const units = getAll();

    // Tin đăng mới phải chỉ rõ chiếc vé được chuyển.
    if (!listing?.unitKey) {
      return {
        ok: false,
        message: "Tin đăng cũ chưa có mã vé riêng."
      };
    }

    const unit = units.find(item =>
      item.unitKey === listing.unitKey
    );

    if (!unit) {
      return {
        ok: false,
        message: "Không tìm thấy vé gốc."
      };
    }

    if (unit.status !== "valid") {
      return {
        ok: false,
        message: "Vé đã sử dụng hoặc không còn hợp lệ."
      };
    }

    if (
      unit.ownerUserId !== listing.ownerUserId ||
      unit.ownerIdentityId !== listing.ownerIdentityId
    ) {
      return {
        ok: false,
        message: "Người đăng bán không còn sở hữu vé."
      };
    }

    if (
      unit.ownerUserId === buyer.userId ||
      unit.ownerIdentityId === buyer.verifiedIdentityId
    ) {
      return {
        ok: false,
        message: "Không thể chuyển vé cho chính mình."
      };
    }

    // Đổi chủ sở hữu và mã QR.
    // Mã QR cũ không còn khớp dữ liệu hiện tại.
    unit.ownerUserId = buyer.userId;
    unit.ownerIdentityId = buyer.verifiedIdentityId;
    unit.qrVersion += 1;
    unit.qrToken = makeId();
    unit.lastTransferOrderId = buyerOrderId;
    unit.transferredAt = new Date().toISOString();

    save(units);

    return { ok: true, ticket: unit };
  }

  function checkIn(qrToken) {
    const units = getAll();
    const unit = units.find(item =>
      item.qrToken === qrToken
    );

    if (!unit) {
      return {
        ok: false,
        message: "QR không hợp lệ hoặc đã bị vô hiệu hóa."
      };
    }

    if (unit.status !== "valid") {
      return {
        ok: false,
        message: "Vé đã được check-in hoặc bị vô hiệu hóa."
      };
    }

    unit.status = "used";
    unit.checkedInAt = new Date().toISOString();

    save(units);

    return {
      ok: true,
      message: "Check-in thành công (DEMO).",
      ticket: unit
    };
  }

  window.TT_TICKETS = {
    getAll,
    getMine,
    createFromOrder,
    transfer,
    checkIn
  };
})();
