
(() => {
  "use strict";

  const USERS_KEY = "tt_demo_users";
  const SESSION_KEY = "tt_demo_session";
  const IDENTITY_KEY = "tt_demo_identity_registry";

  function readJSON(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function normalizeIdentity(identity) {
    return String(identity || "").trim().toUpperCase();
  }

  function getUsers() {
    const users = readJSON(USERS_KEY, []);
    return Array.isArray(users) ? users : [];
  }

  function getSession() {
    return readJSON(SESSION_KEY, null);
  }

  function getCurrentUser() {
    const session = getSession();
    if (!session?.userId) return null;

    return getUsers().find(
      user => user.id === session.userId
    ) || null;
  }

  function createId() {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }

    return "USR-" + Date.now() + "-" +
      Math.random().toString(36).slice(2, 9);
  }

  function register({ name, email, password }) {
    name = String(name || "").trim();
    email = normalizeEmail(email);
    password = String(password || "");

    if (!name || !email || !password) {
      throw new Error("Vui lòng nhập đầy đủ thông tin.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Email không hợp lệ.");
    }

    if (password.length < 6) {
      throw new Error("Mật khẩu cần ít nhất 6 ký tự.");
    }

    const users = getUsers();

    if (users.some(user => user.email === email)) {
      throw new Error("Email này đã được đăng ký.");
    }

    // Chỉ phục vụ demo. Không sử dụng mật khẩu thật.
    // Production phải xác thực qua backend.
    const user = {
      id: createId(),
      name,
      email,
      password,
      verified: false,
      verifiedIdentityId: null,
      createdAt: new Date().toISOString()
    };

    users.push(user);
    saveJSON(USERS_KEY, users);

    saveJSON(SESSION_KEY, {
      userId: user.id
    });

    return user;
  }

  function login(email, password) {
    email = normalizeEmail(email);

    const user = getUsers().find(
      item =>
        item.email === email &&
        item.password === String(password)
    );

    if (!user) {
      throw new Error("Email hoặc mật khẩu không đúng.");
    }

    saveJSON(SESSION_KEY, {
      userId: user.id
    });

    return user;
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
  }

  function verifyIdentity(identityCode) {
    const user = getCurrentUser();

    if (!user) {
      throw new Error("Bạn cần đăng nhập trước.");
    }

    if (user.verified) {
      throw new Error("Tài khoản này đã được xác minh.");
    }

    const code = normalizeIdentity(identityCode);

    // Mã giả lập, tuyệt đối không nhập CCCD thật.
    if (!/^DEMO-[A-Z0-9]{3,20}$/.test(code)) {
      throw new Error(
        "Mã danh tính demo phải có dạng DEMO-USER001."
      );
    }

    const registry = readJSON(IDENTITY_KEY, {});
    const users = getUsers();

    const existingUser = users.find(
      item =>
        item.verified &&
        item.verifiedIdentityId === code
    );

    if (
      (registry[code] && registry[code] !== user.id) ||
      (existingUser && existingUser.id !== user.id)
    ) {
      throw new Error(
        "Danh tính này đã liên kết với tài khoản khác."
      );
    }

    const index = users.findIndex(
      item => item.id === user.id
    );

    users[index].verified = true;
    users[index].verifiedIdentityId = code;
    users[index].verifiedAt = new Date().toISOString();

    registry[code] = user.id;

    saveJSON(USERS_KEY, users);
    saveJSON(IDENTITY_KEY, registry);

    return users[index];
  }

  window.TT_AUTH = {
    register,
    login,
    logout,
    verifyIdentity,
    getCurrentUser,
    getUsers
  };
})();
