
(() => {
  "use strict";

  const USERS_KEY = "tt_demo_users";
  const SESSION_KEY = "tt_demo_session";
  const IDENTITY_KEY = "tt_demo_identity_registry";

  // Toàn bộ hồ sơ dưới đây đều là dữ liệu giả.
  const PROFILES = [
    {
      id: "profile-001",
      name: "Nguyễn Minh An",
      birthYear: 2003,
      document: "Giấy tờ mẫu A",
      identityId: "DEMO-IDENTITY-001"
    },
    {
      id: "profile-002",
      name: "Trần Hoài Bình",
      birthYear: 2001,
      document: "Giấy tờ mẫu B",
      identityId: "DEMO-IDENTITY-002"
    },
    {
      id: "profile-003",
      name: "Lê Khánh Chi",
      birthYear: 2004,
      document: "Giấy tờ mẫu C",
      identityId: "DEMO-IDENTITY-003"
    }
  ];

  function readJSON(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getUsers() {
    const users = readJSON(USERS_KEY, []);
    return Array.isArray(users) ? users : [];
  }

  function getCurrentUser() {
    const session = readJSON(SESSION_KEY, null);

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
      Math.random().toString(36).slice(2, 10);
  }

  function register({ name, email, password }) {
    name = String(name || "").trim();
    email = String(email || "").trim().toLowerCase();
    password = String(password || "");

    if (!name || !email || !password) {
      throw new Error("Vui lòng nhập đầy đủ thông tin.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Email không hợp lệ.");
    }

    if (password.length < 6) {
      throw new Error("Mật khẩu phải có ít nhất 6 ký tự.");
    }

    const users = getUsers();

    if (users.some(user => user.email === email)) {
      throw new Error("Email này đã được đăng ký.");
    }

    const user = {
      id: createId(),
      name,
      email,
      // Chỉ dành cho demo. Không dùng mật khẩu thật.
      password,
      verified: false,
      verifiedIdentityId: null,
      verifiedProfileId: null,
      createdAt: new Date().toISOString()
    };

    users.push(user);

    saveJSON(USERS_KEY, users);
    saveJSON(SESSION_KEY, { userId: user.id });

    return user;
  }

  function login(email, password) {
    email = String(email || "").trim().toLowerCase();

    const user = getUsers().find(item =>
      item.email === email &&
      item.password === String(password)
    );

    if (!user) {
      throw new Error("Email hoặc mật khẩu không đúng.");
    }

    saveJSON(SESSION_KEY, { userId: user.id });
    return user;
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
  }

  function getProfiles() {
    return PROFILES.map(profile => ({ ...profile }));
  }

  function verifyProfile(profileId) {
    const user = getCurrentUser();

    if (!user) {
      throw new Error("Vui lòng đăng nhập trước.");
    }

    if (user.verified) {
      throw new Error("Tài khoản đã được xác minh.");
    }

    const profile = PROFILES.find(
      item => item.id === profileId
    );

    if (!profile) {
      throw new Error("Hồ sơ mẫu không hợp lệ.");
    }

    const users = getUsers();
    const registry = readJSON(IDENTITY_KEY, {});

    const existingUser = users.find(item =>
      item.id !== user.id &&
      item.verified &&
      (
        item.verifiedIdentityId === profile.identityId ||
        item.verifiedProfileId === profile.id
      )
    );

    if (
      existingUser ||
      (
        registry[profile.identityId] &&
        registry[profile.identityId] !== user.id
      )
    ) {
      throw new Error(
        "Danh tính này đã liên kết với tài khoản khác. " +
        "Không thể xác minh lại bằng email mới."
      );
    }

    const index = users.findIndex(
      item => item.id === user.id
    );

    if (index === -1) {
      throw new Error("Không tìm thấy tài khoản.");
    }

    users[index] = {
      ...users[index],
      verified: true,
      verifiedProfileId: profile.id,
      verifiedIdentityId: profile.identityId,
      verifiedAt: new Date().toISOString()
    };

    registry[profile.identityId] = user.id;

    saveJSON(USERS_KEY, users);
    saveJSON(IDENTITY_KEY, registry);

    return users[index];
  }

  // Chặn cách nhập mã thủ công của phiên bản cũ.
  function verifyIdentity() {
    throw new Error(
      "Hãy thực hiện quy trình eKYC tại auth.html."
    );
  }

  window.TT_AUTH = {
    register,
    login,
    logout,
    getUsers,
    getCurrentUser,
    getProfiles,
    verifyProfile,
    verifyIdentity
  };
})();
