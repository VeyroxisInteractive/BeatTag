const SUPABASE_URL = "https://axllkismvbqikwdvkayz.supabase.co";

const SUPABASE_KEY = "sb_publishable_vtacQ7gTtSepf4BSzlAQmw_aOJI3Yvw";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);
/* =========================
   SUPABASE AUTH
========================= */

let authMode = "login";
let currentUserId = null;
let followingIds = new Set();
let shopInventory = new Map();

function showAuthScreen() {
  document.getElementById("authScreen")?.classList.remove("hidden");
  document.getElementById("app")?.classList.add("hidden");
}

function showApp() {
  document.getElementById("authScreen")?.classList.add("hidden");
  document.getElementById("app")?.classList.remove("hidden");
}

function toggleAuthMode() {
  authMode = authMode === "login" ? "signup" : "login";

  const isSignup = authMode === "signup";

  document.getElementById("authTitle").textContent =
    isSignup ? "Create Account" : "Login";

  document.getElementById("authSubmitBtn").textContent =
    isSignup ? "Sign Up" : "Login";

  document.getElementById("authSwitchText").textContent =
    isSignup
      ? "Already have an account? Login"
      : "Don't have an account? Sign Up";

  document
    .querySelectorAll(".auth-only-signup")
    .forEach(el => el.classList.toggle("hidden", !isSignup));

  const forgot = document.getElementById("forgotPasswordBtn");
  if (forgot) forgot.classList.toggle("hidden", isSignup);

  document.getElementById("authMessage").textContent = "";
}

async function submitAuth() {
  const name =
    document.getElementById("authName")?.value.trim() || "";

  const username =
    document.getElementById("authUsername")?.value.trim() || "";

  const email =
    document.getElementById("authEmail")?.value.trim() || "";

  const password =
    document.getElementById("authPassword")?.value || "";

  const message = document.getElementById("authMessage");
  const button = document.getElementById("authSubmitBtn");

  message.textContent = "";

  if (!email || !password) {
    message.textContent = "Email and password are required.";
    return;
  }

  if (password.length < 6) {
    message.textContent = "Password must be at least 6 characters.";
    return;
  }

  button.disabled = true;
  button.textContent = "Please wait...";

  try {
    if (authMode === "signup") {
      if (!name || !username) {
        message.textContent = "Enter your name and username.";
        return;
      }

      const cleanUsername = username
        .replace(/^@/, "")
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "");

      if (cleanUsername.length < 3) {
        message.textContent = "Username must be at least 3 characters.";
        return;
      }

      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            "https://veyroxisinteractive.github.io/BeatTag/",
          data: {
            name,
            username: cleanUsername
          }
        }
      });

      if (error) throw error;

      if (!data.session) {
        message.textContent =
          "Account created ✅ Check your inbox or spam folder for the verification link.";
      } else {
        showApp();
      }
    } else {
      const { data, error } =
        await supabaseClient.auth.signInWithPassword({
          email,
          password
        });

      if (error) throw error;

      if (data.session) {
        showApp();
      }
    }
  } catch (err) {
    message.textContent = err.message || "Something went wrong.";
  } finally {
    button.disabled = false;
    button.textContent =
      authMode === "signup" ? "Sign Up" : "Login";
  }
}

async function logoutBeatTag() { try { closeAllBeatTagOverlays(); await supabaseClient.auth.signOut(); } finally { currentUserId=null; isAdmin=false; closeAllBeatTagOverlays(); showAuthScreen(); window.scrollTo(0,0); } }
function closeAllBeatTagOverlays(){ try{stopStream();}catch(_){} document.querySelectorAll('.modal').forEach(el=>el.classList.add('hidden')); if(modalCard) modalCard.innerHTML=''; }

function showForgotPasswordModal() {
  modal.classList.remove('hidden');
  modalCard.innerHTML = `
    <div class="modal-head">
      <h3>Reset Password</h3>
      <button class="close" onclick="closeModal()">×</button>
    </div>
    <p class="muted">Enter your BeatTag account email. We will send you a secure password-reset link.</p>
    <div class="field">
      <label>Email</label>
      <input id="resetEmail" type="email" autocomplete="email" placeholder="you@example.com" value="${escapeAttr(document.getElementById('authEmail')?.value || '')}">
    </div>
    <div id="resetMessage" class="inline-message"></div>
    <button id="resetSendBtn" class="primary" style="width:100%" onclick="sendPasswordReset()">Send Reset Link</button>
  `;
}

async function sendPasswordReset() {
  const email = ($('#resetEmail')?.value || '').trim();
  const message = $('#resetMessage');
  const button = $('#resetSendBtn');
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    if (message) message.textContent = 'Enter a valid email address.';
    return;
  }
  try {
    if (button) { button.disabled = true; button.textContent = 'Sending…'; }
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://veyroxisinteractive.github.io/BeatTag/'
    });
    if (error) throw error;
    if (message) message.textContent = 'Reset link sent. Check your inbox and spam folder.';
  } catch (err) {
    if (message) message.textContent = err.message || 'Could not send the reset email.';
  } finally {
    if (button) { button.disabled = false; button.textContent = 'Send Reset Link'; }
  }
}

function showResetPasswordModal() {
  modal.classList.remove('hidden');
  modalCard.innerHTML = `
    <div class="modal-head">
      <h3>Create New Password</h3>
      <button class="close" onclick="closeModal()">×</button>
    </div>
    <div class="field"><label>New Password</label><input id="newPassword" type="password" minlength="8" autocomplete="new-password" placeholder="At least 8 characters"></div>
    <div class="field"><label>Confirm Password</label><input id="confirmNewPassword" type="password" minlength="8" autocomplete="new-password" placeholder="Repeat password"></div>
    <div id="newPasswordMessage" class="inline-message"></div>
    <button id="updatePasswordBtn" class="primary" style="width:100%" onclick="updateRecoveredPassword()">Update Password</button>
  `;
}

async function updateRecoveredPassword() {
  const password = $('#newPassword')?.value || '';
  const confirmPassword = $('#confirmNewPassword')?.value || '';
  const message = $('#newPasswordMessage');
  const button = $('#updatePasswordBtn');
  if (password.length < 8) {
    if (message) message.textContent = 'Password must be at least 8 characters.';
    return;
  }
  if (password !== confirmPassword) {
    if (message) message.textContent = 'Passwords do not match.';
    return;
  }
  try {
    if (button) { button.disabled = true; button.textContent = 'Updating…'; }
    const { error } = await supabaseClient.auth.updateUser({ password });
    if (error) throw error;
    closeModal();
    toast('Password updated ✅');
    showApp();
  } catch (err) {
    if (message) message.textContent = err.message || 'Could not update password.';
  } finally {
    if (button) { button.disabled = false; button.textContent = 'Update Password'; }
  }
}

async function initAuth() {
  const {
    data: { session }
  } = await supabaseClient.auth.getSession();
if (session) {
  const profileReady = await loadRealProfile();
  if (profileReady === false) return;
  await checkAdmin();
  await loadFollowing();
  await loadShopInventory();

  await loadChallengesFromSupabase();

  await Promise.all([
    loadReactionsFromSupabase(),
    loadCommentsFromSupabase(),
    loadTagsFromSupabase()
  ]);

  showApp();

  if (currentTab === 'home') {
    renderHome();
  } else {
    go(currentTab);
  }
} else {
    showAuthScreen();
  }
}

supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === "PASSWORD_RECOVERY") {
    showAuthScreen();
    setTimeout(showResetPasswordModal, 50);
    return;
  }
  if (session) {
    showApp();
  } else {
    showAuthScreen();
  }
});

window.addEventListener("DOMContentLoaded", initAuth);
const $ = s => document.querySelector(s);
const screenEl = $('#screen');
const modal = $('#modal');
const modalCard = $('#modalCard');

const MEDIA_LIMITS = Object.freeze({
  photo: { maxBytes: 10 * 1024 * 1024, types: ['image/jpeg','image/png','image/webp'], label: '10MB' },
  video: { maxBytes: 50 * 1024 * 1024, types: ['video/mp4','video/webm'], label: '50MB' },
  audio: { maxBytes: 20 * 1024 * 1024, types: ['audio/mpeg','audio/mp3','audio/wav','audio/webm'], label: '20MB' }
});
const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 1500;
let isPublishingChallenge = false;

const DBKEY = 'beattag_v2_state';

let state =
  JSON.parse(localStorage.getItem(DBKEY) || 'null') ||
  seedState();
async function loadRealProfile() {
  try {
    const {
      data: { user }
    } = await supabaseClient.auth.getUser();

    if (!user) return;
    currentUserId = user.id;

    const { data: profile, error } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Profile load error:", error);
      return;
    }

    const localProfile = state.profiles[state.currentProfile];

    if (localProfile && profile) {
      localProfile.name =
        profile.name || user.user_metadata?.name || "BeatTag User";

      localProfile.handle =
        "@" + (
          profile.username ||
          user.user_metadata?.username ||
          "user"
        );

      localProfile.coins = profile.coins ?? 100;
      localProfile.streak = profile.streak ?? 0;
      localProfile.bio = profile.bio || "";
      localProfile.websiteUrl1 = profile.website_url_1 || "";
      localProfile.websiteUrl2 = profile.website_url_2 || "";
      localProfile.avatarUrl = profile.avatar_url || "";
      localProfile.deletedAt = profile.deleted_at ? new Date(profile.deleted_at).getTime() : 0;
      localProfile.equippedFrame = profile.equipped_frame || "";
      localProfile.equippedBadge = profile.equipped_badge || "";
      localProfile.equippedTheme = profile.equipped_theme || "";
      localProfile.dailyRewardClaimedAt = profile.daily_reward_claimed_at ? new Date(profile.daily_reward_claimed_at).getTime() : 0;

      const suspendedUntil = profile.suspended_until
        ? new Date(profile.suspended_until).getTime()
        : 0;

      if (profile.deleted_at) {
        await supabaseClient.auth.signOut();
        showAuthScreen();
        const authMessage = document.getElementById("authMessage");
        if (authMessage) authMessage.textContent = "This account has been deleted/deactivated.";
        return false;
      }

      if (profile.is_banned || suspendedUntil > Date.now()) {
        const reason = profile.moderation_reason || "Community Guidelines violation";
        const message = profile.is_banned
          ? `This BeatTag account is banned. ${reason}`
          : `This BeatTag account is suspended until ${new Date(suspendedUntil).toLocaleString()}. ${reason}`;

        await supabaseClient.auth.signOut();
        showAuthScreen();
        const authMessage = document.getElementById("authMessage");
        if (authMessage) authMessage.textContent = message;
        return false;
      }

      save();

      const coinEl = document.getElementById("coinCount");
      if (coinEl) coinEl.textContent = localProfile.coins;
    }

    return true;
  } catch (err) {
    console.error("Profile error:", err);
  }
}
let isAdmin = false;

async function checkAdmin() {
  try {
    if (!currentUserId) {
      isAdmin = false;
      return;
    }

    const { data, error } =
      await supabaseClient
        .from('admins')
        .select('user_id')
        .eq('user_id', currentUserId)
        .maybeSingle();

    if (error) {
      console.error('Admin check error:', error);
      isAdmin = false;
      return;
    }

    isAdmin = !!data;

  } catch (err) {
    console.error('Admin check error:', err);
    isAdmin = false;
  }
}
async function loadReactionsFromSupabase() {
  try {
    const { data: reactions, error } =
      await supabaseClient
        .from('reactions')
        .select('*');

    if (error) throw error;

    state.challenges.forEach(c => {
      c.likes = {};
      c.dislikes = {};
    });

    (reactions || []).forEach(r => {
      const challenge =
        state.challenges.find(
          c => c.id === r.challenge_id
        );

      if (!challenge) return;

      if (r.reaction_type === 'like') {
        challenge.likes[r.user_id] = true;
      }

      if (r.reaction_type === 'dislike') {
        challenge.dislikes[r.user_id] = true;
      }
    });

    save();

    console.log(
      'Supabase reactions loaded:',
      reactions?.length || 0
    );

  } catch (err) {
    console.error(
      'loadReactionsFromSupabase error:',
      err
    );
  }
}
async function loadCommentsFromSupabase() {
  try {
    const { data: comments, error } =
      await supabaseClient
        .from('comments')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) throw error;

    const userIds = [
      ...new Set(
        (comments || [])
          .map(c => c.user_id)
          .filter(Boolean)
      )
    ];

    let profileMap = {};

    if (userIds.length) {
      const { data: profiles } =
        await supabaseClient
          .from('profiles')
          .select('id,name,username,avatar_url')
          .in('id', userIds);

      (profiles || []).forEach(p => {
        profileMap[p.id] = p;
      });
    }

    state.challenges.forEach(c => {
      c.comments = [];
    });

    (comments || []).forEach(item => {
      const challenge =
        state.challenges.find(
          c => c.id === item.challenge_id
        );

      if (!challenge) return;

      const p = profileMap[item.user_id];

      challenge.comments.push({
        id: item.id,
        profile: item.user_id,
        name: p?.name || p?.username || 'BeatTag User',
        handle: p?.username ? '@' + String(p.username).replace(/^@/, '') : '',
        avatarUrl: p?.avatar_url || '',
        text: item.comment_text,
        time: new Date(item.created_at).getTime()
      });
    });

    save();

    console.log(
      'Supabase comments loaded:',
      comments?.length || 0
    );

  } catch (err) {
    console.error(
      'loadCommentsFromSupabase error:',
      err
    );
  }
}
async function loadTagsFromSupabase() {
  try {
    const { data: tags, error } =
      await supabaseClient
        .from('challenge_tags')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) throw error;

    state.challenges.forEach(c => {
      c.tags = [];
    });

    (tags || []).forEach(tag => {
      const challenge =
        state.challenges.find(
          c => c.id === tag.challenge_id
        );

      if (!challenge) return;

      const name =
        tag.tagged_name ||
        tag.friend_name;

      if (
        name &&
        !challenge.tags.includes(name)
      ) {
        challenge.tags.push(name);
      }
    });

    save();

    console.log(
      'Supabase tags loaded:',
      tags?.length || 0
    );

  } catch (err) {
    console.error(
      'loadTagsFromSupabase error:',
      err
    );
  }
}
async function loadChallengesFromSupabase() {
  try {
    const { data: challenges, error } = await supabaseClient
      .from("challenges")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Challenge load error:", error);
      return;
    }

    if (!challenges || !challenges.length) {
  state.challenges = [];
  save();
  return;
}
    const creatorIds = [
      ...new Set(
        challenges
          .map(c => c.creator_id)
          .filter(Boolean)
      )
    ];

    let profileMap = {};

    if (creatorIds.length) {
      const { data: profiles, error: profileError } =
        await supabaseClient
          .from("profiles")
          .select("*")
          .in("id", creatorIds);

      if (!profileError && profiles) {
        profiles.forEach(p => {
          profileMap[p.id] = p;
        });
      }
    }

    const cloudChallenges = challenges.map(c => {
      const creatorProfile = profileMap[c.creator_id];

      return {
        id: c.id,
        creator: c.creator_id,
        creatorName:
          creatorProfile?.name ||
          creatorProfile?.username ||
          "BeatTag User",
        creatorHandle: creatorProfile?.username ? '@' + String(creatorProfile.username).replace(/^@/, '') : '',
        creatorAvatarUrl: creatorProfile?.avatar_url || '',

        title: c.title,
        type: c.challenge_type,
        text: c.description || "",

        createdAt:
          new Date(c.created_at).getTime(),

        parentId: c.parent_id,
        generation: c.generation || 1,

        likes: {},
        dislikes: {},
        comments: [],

        attempts: c.attempts_count || 0,
        boostedUntil: c.boosted_until ? new Date(c.boosted_until).getTime() : 0,
        tags: [],

        media: c.media_url
          ? {
              kind:
                c.challenge_type === "photo"
                  ? "image"
                  : c.challenge_type,
              data: c.media_url
            }
          : null
      };
    });

    state.challenges = cloudChallenges;

    save();

    console.log(
      "Supabase challenges loaded:",
      cloudChallenges.length
    );

  } catch (err) {
    console.error(
      "loadChallengesFromSupabase error:",
      err
    );
  }
}
let currentType = 'text';
let captureBlob = null;
let captureUrl = '';
let recorder = null;
let chunks = [];
let stream = null;
let activeCameraKind = null;
let cameraFacingMode = 'environment';


/* =========================
   START DATA
========================= */

function seedState() {
  return {
    currentProfile: 'p1',

    profiles: {
      p1: {
        id: 'p1',
        name: 'Mithilesh',
        handle: '@mithilesh',
        coins: 280,
        streak: 3,
        unlocks: [],
        createdAt: Date.now()
      }
    },

    challenges: [
      {
        id: 'c1',
        creator: 'p1',
        creatorName: 'Mithilesh',
        title: 'Can you take a better sunset photo?',
        type: 'text',
        text: 'Post a better sunset photo than mine 🌇',
        createdAt: Date.now() - 7200000,
        parentId: null,
        generation: 1,
        likes: {
          demo1: true,
          demo2: true,
          demo3: true
        },
        dislikes: {},
        comments: [
          {
            profile: 'demo1',
            name: 'Rahul',
            text: 'Challenge accepted 🔥',
            time: Date.now() - 100000
          }
        ],
        attempts: 4,
        tags: ['Shivam'],
        media: null
      },

      {
        id: 'c2',
        creator: 'guest1',
        creatorName: 'Aman',
        title: 'Beat my 30 push-ups!',
        type: 'text',
        text: '30 push-ups in one go. Can you beat it? 💪',
        createdAt: Date.now() - 14400000,
        parentId: null,
        generation: 1,
        likes: {
          demo1: true,
          demo2: true
        },
        dislikes: {},
        comments: [],
        attempts: 2,
        tags: [],
        media: null
      }
    ],

    notifications: [
      {
        text: 'Welcome to BeatTag 🔥',
        time: Date.now(),
        read: false
      }
    ],

    purchases: []
  };
}


/* =========================
   BASIC HELPERS
========================= */

function save() {
  try {
    localStorage.setItem(
      DBKEY,
      JSON.stringify(state)
    );
  } catch (e) {
    console.warn('Storage full:', e);

    toast(
      'Storage is full. The large photo or video could not be saved in your browser.'
    );
  }

  updateCoins();
  updateNotificationDot();
}

function profile() {
  return state.profiles[state.currentProfile];
}

function updateCoins() {
  const e = $('#coinCount');

  if (e) {
    e.textContent = profile().coins;
  }
}

function updateNotificationDot() {
  const dot = $('#notifDot');

  if (!dot) return;

  const unread =
    state.notifications.some(
      n => !n.read
    );

  dot.classList.toggle(
    'hidden',
    !unread
  );
}

function fmt(t) {
  const m =
    Math.floor(
      (Date.now() - t) / 60000
    );

  if (m < 1) return 'now';
  if (m < 60) return m + 'm ago';

  const h =
    Math.floor(m / 60);

  if (h < 24) return h + 'h ago';

  return (
    Math.floor(h / 24) +
    'd ago'
  );
}

function toast(msg) {
  const old =
    document.querySelector('.toast');

  if (old) old.remove();

  const d =
    document.createElement('div');

  d.className = 'toast';
  d.textContent = msg;

  document.body.appendChild(d);

  setTimeout(() => {
    d.remove();
  }, 1800);
}



function beatDialog({title='BeatTag',message='',value='',confirmText='Confirm',cancelText='Cancel',danger=false,multiline=false,input=false}={}) {
  return new Promise(resolve => {
    const overlay=document.createElement('div'); overlay.className='bt-dialog-overlay';
    const field=input?(multiline?`<textarea class="bt-dialog-input" rows="5">${escapeHTML(value)}</textarea>`:`<input class="bt-dialog-input" value="${escapeAttr(value)}">`):'';
    overlay.innerHTML=`<div class="bt-dialog" role="dialog" aria-modal="true"><div class="bt-dialog-icon">${danger?'!':'✦'}</div><h3>${escapeHTML(title)}</h3>${message?`<p>${escapeHTML(message)}</p>`:''}${field}<div class="bt-dialog-actions"><button class="secondary bt-dialog-cancel">${escapeHTML(cancelText)}</button><button class="${danger?'danger':'primary'} bt-dialog-confirm">${escapeHTML(confirmText)}</button></div></div>`;
    document.body.appendChild(overlay);
    const fieldEl=overlay.querySelector('.bt-dialog-input');
    const finish=v=>{overlay.remove();resolve(v);};
    overlay.querySelector('.bt-dialog-cancel').onclick=()=>finish(null);
    overlay.querySelector('.bt-dialog-confirm').onclick=()=>finish(input?(fieldEl?.value??''):true);
    overlay.onclick=e=>{if(e.target===overlay)finish(null);};
    setTimeout(()=>fieldEl?.focus(),30);
  });
}
function beatConfirm(title,message,confirmText='Confirm',danger=false){return beatDialog({title,message,confirmText,danger});}
function beatPrompt(title,message,value='',options={}){return beatDialog({title,message,value,confirmText:options.confirmText||'Save',multiline:!!options.multiline,input:true});}
async function copyLinkFallback(title,url){await beatPrompt(title,'Copy the link below:',url,{confirmText:'Done'});}

/* =========================
   NAVIGATION
========================= */

let currentTab = 'home';
let currentFeedMode = 'all';
let exploreSearchTimer = null;
let searchRequestToken = 0;

const btNavHistory = [];
let btNavigatingBack = false;

function go(tab) {
  const previousTab = currentTab;

  if (!btNavigatingBack && previousTab && previousTab !== tab) {
    btNavHistory.push(previousTab);
    if (btNavHistory.length > 40) btNavHistory.shift();
  }

  currentTab = tab;

  document.body.classList.remove('bt-chat-open');
  document.querySelector('.bottom-nav')?.classList.remove('bt-chat-hidden');

  setBeatTagBannerVisible(tab === 'home');
  stopStream();

  document.querySelectorAll('.bottom-nav button').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });

  if (tab === 'home') renderHome();
  if (tab === 'explore') renderExplore();
  if (tab === 'featured') renderFeatured();
  if (tab === 'create') renderCreate();
  if (tab === 'chains') renderChains();
  if (tab === 'shop') renderShop();
  if (tab === 'profile') renderProfile();
  if (tab === 'messages') renderMessagesInbox();
  if (tab === 'music') renderMusic();
  if (tab === 'vibe') renderVibeWorld();

  updateMessagesBadge();

  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

window.beatTagHandleAndroidBack = function () {
  try {
    const dialog = document.querySelector('.bt-dialog-overlay');
    if (dialog) {
      const cancel = dialog.querySelector('.bt-dialog-cancel');
      if (cancel) cancel.click();
      else dialog.remove();
      return true;
    }

    if (modal && !modal.classList.contains('hidden')) {
      closeModal();
      return true;
    }

    const ytPlayer = document.getElementById('btYouTubePlayer');
    if (ytPlayer) {
      const close = document.getElementById('btYTClose');
      if (close) close.click();
      else ytPlayer.remove();
      return true;
    }

    if (
      document.body.classList.contains('bt-chat-open') ||
      activeConversationId
    ) {
      activeConversationId = null;
      renderMessagesInbox();
      return true;
    }

    if (currentTab === 'public-profile' || currentTab === 'leaderboard') {
      btNavigatingBack = true;
      try { go('explore'); }
      finally { btNavigatingBack = false; }
      return true;
    }

    while (btNavHistory.length) {
      const previous = btNavHistory.pop();
      if (previous && previous !== currentTab) {
        btNavigatingBack = true;
        try { go(previous); }
        finally { btNavigatingBack = false; }
        return true;
      }
    }

    if (currentTab !== 'home') {
      btNavigatingBack = true;
      try { go('home'); }
      finally { btNavigatingBack = false; }
      return true;
    }

    return false;
  } catch (err) {
    console.error('BeatTag Back handler failed:', err);
    return false;
  }
};

/* =========================
   FEATURED SCORE
========================= */

function featuredScore(c) {

  const likes =
    Object.keys(
      c.likes || {}
    ).length;

  const comments =
    (c.comments || []).length;

  const attempts =
    c.attempts || 0;

  return (
    likes * 3 +
    comments * 2 +
    attempts * 4 +
    c.generation
  );
}

function getFeaturedChallenges(
  limit = 5
) {

  return state.challenges
    .slice()
    .sort(
      (a, b) =>
        featuredScore(b) -
        featuredScore(a)
    )
    .slice(0, limit);
}


/* =========================
   FOLLOW SYSTEM
========================= */

async function loadFollowing() {
  followingIds = new Set();
  if (!currentUserId) return;

  try {
    const { data, error } = await supabaseClient
      .from('follows')
      .select('following_id')
      .eq('follower_id', currentUserId);

    if (error) throw error;
    (data || []).forEach(row => followingIds.add(row.following_id));
  } catch (err) {
    console.warn('Follow system unavailable:', err?.message || err);
  }
}

function isFollowing(userId) {
  return !!userId && followingIds.has(userId);
}

async function toggleFollow(userId, fallbackName = 'BeatTag User') {
  if (!currentUserId) {
    toast('Please log in first.');
    return;
  }

  if (!userId || userId === currentUserId) return;

  const alreadyFollowing = isFollowing(userId);

  try {
    if (alreadyFollowing) {
      const { error } = await supabaseClient
        .from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', userId);
      if (error) throw error;
      followingIds.delete(userId);
      toast('Unfollowed.');
    } else {
      const { error } = await supabaseClient
        .from('follows')
        .insert({ follower_id: currentUserId, following_id: userId });
      if (error) throw error;
      followingIds.add(userId);
      toast('Following ✓');
    }

    if (currentTab === 'public-profile') {
      await renderPublicProfile(userId, fallbackName);
    } else if (currentTab === 'home' && currentFeedMode === 'friends') {
      renderFeed('friends');
    }
  } catch (err) {
    console.error('Follow error:', err);
    toast(err?.message || 'Could not update follow status. Run the BeatTag V2 database upgrade first.');
  }
}

function creatorLeaderboard(limit = 20) {
  const map = new Map();

  state.challenges.forEach(c => {
    if (!c.creator) return;
    const entry = map.get(c.creator) || {
      id: c.creator,
      name: c.creatorName || 'BeatTag User',
      avatarUrl: c.creatorAvatarUrl || '',
      posts: 0,
      likes: 0,
      attempts: 0,
      score: 0
    };

    const likes = Object.keys(c.likes || {}).length;
    const comments = (c.comments || []).length;
    const attempts = c.attempts || 0;

    entry.posts += 1;
    entry.likes += likes;
    entry.attempts += attempts;
    entry.score += likes * 3 + comments * 2 + attempts * 4 + (c.generation || 1);
    map.set(c.creator, entry);
  });

  return [...map.values()]
    .sort((a, b) => b.score - a.score || b.likes - a.likes || b.attempts - a.attempts)
    .slice(0, limit);
}

function renderLeaderboard() {
  currentTab = 'leaderboard';
  stopStream();
  const leaders = creatorLeaderboard(50);

  screenEl.innerHTML = `
    <div class="section-title leaderboard-title-row">
      <div>
        <div class="eyebrow">COMMUNITY RANKING</div>
        <h2>Leaderboard</h2>
      </div>
      <button class="ghost" onclick="go('explore')">← Explore</button>
    </div>

    <section class="leaderboard-hero">
      <div class="leaderboard-orb">✦</div>
      <div>
        <strong>Top BeatTag Creators</strong>
        <p>Ranked by challenge activity, likes, comments, attempts and chain growth.</p>
      </div>
    </section>

    <div class="leaderboard-list" id="leaderboardList"></div>
  `;

  const list = $('#leaderboardList');
  if (!leaders.length) {
    list.innerHTML = '<div class="empty">No leaderboard data yet.</div>';
    return;
  }

  leaders.forEach((creator, index) => {
    const row = document.createElement('button');
    row.className = `leaderboard-row ${index < 3 ? 'top-three' : ''}`;
    row.type = 'button';
    row.onclick = () => renderPublicProfile(creator.id, creator.name);
    row.innerHTML = `
      <span class="leaderboard-rank">${index + 1}</span>
      <span class="leaderboard-avatar">${creator.avatarUrl ? `<img src="${escapeAttr(creator.avatarUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">` : (escapeHTML(creator.name)[0] || 'B')}</span>
      <span class="leaderboard-person">
        <strong>${escapeHTML(creator.name)}</strong>
        <small>${creator.posts} challenges · ${creator.likes} likes · ${creator.attempts} attempts</small>
      </span>
      <span class="leaderboard-score">${creator.score}<small>PTS</small></span>
    `;
    list.appendChild(row);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* =========================
   HOME
========================= */

function renderHome() {

  screenEl.innerHTML = `

    <section class="hero">

      <h1>
        Beat it. Tag them.<br>
        Keep it going.
      </h1>

      <p>
        Create any challenge,
        beat your friends
        and grow the chain.
      </p>

      <div class="hero-actions">

        <button
          class="primary"
          onclick="go('create')">
          ＋ Create Challenge
        </button>

        <button
          class="secondary"
          onclick="go('featured')">
          ⭐ Featured
        </button>

      </div>

    </section>


    <section class="featured-section">

      <div class="featured-header">

        <h2>
          ⭐ Featured Challenges
        </h2>

        <button
          class="ghost"
          onclick="go('featured')">
          View All
        </button>

      </div>

      <div
        class="featured-list"
        id="homeFeatured">
      </div>

    </section>


    <div class="pills">

      <button
        class="pill ${currentFeedMode === 'all' ? 'active' : ''}"
        onclick="renderFeed('all',this)">
        For You
      </button>

      <button
        class="pill ${currentFeedMode === 'trending' ? 'active' : ''}"
        onclick="renderFeed('trending',this)">
        🔥 Trending
      </button>

      <button
        class="pill ${currentFeedMode === 'friends' ? 'active' : ''}"
        onclick="renderFeed('friends',this)">
        Following
      </button>

      <button
        class="pill ${currentFeedMode === 'new' ? 'active' : ''}"
        onclick="renderFeed('new',this)">
        New
      </button>

    </div>


    <div class="section-title">

      <h2>
        Challenges
      </h2>

      <span class="muted">
        ${state.challenges.length} posts
      </span>

    </div>

    <div id="feed"></div>
  `;

  renderFeaturedStrip();

  renderFeed(currentFeedMode);
}


/* =========================
   HOME FEATURED STRIP
========================= */

function renderFeaturedStrip() {

  const box =
    $('#homeFeatured');

  if (!box) return;

  const featured =
    getFeaturedChallenges(4);

  box.innerHTML = '';

  if (!featured.length) {

    box.innerHTML = `
      <div class="empty">
        No featured challenges yet.
      </div>
    `;

    return;
  }

  featured.forEach(
    (c, index) => {

      const likes =
        Object.keys(
          c.likes || {}
        ).length;

      const comments =
        (c.comments || []).length;

      const el =
        document.createElement('div');

      el.className =
        'featured-card';

      el.innerHTML = `

        <div class="featured-rank">
          #${index + 1}
        </div>

        <div class="featured-badge">
          ⭐ FEATURED
        </div>

        <h3>
          ${escapeHTML(c.title)}
        </h3>

        <p>
          by ${escapeHTML(c.creatorName)}
        </p>

        <div class="featured-stats">

          <span>
            ❤️ ${likes}
          </span>

          <span>
            💬 ${comments}
          </span>

          <span>
            🔥 ${c.attempts || 0}
          </span>

          <span>
            ⛓ Gen ${c.generation}
          </span>

        </div>

        <button
          class="primary"
          style="width:100%;margin-top:14px"
          onclick="openBeat('${c.id}')">

          🔥 Beat This

        </button>
      `;

      box.appendChild(el);
    }
  );
}


/* =========================
   HOME FILTERS
========================= */

function sortFeedByBoostAndTime(arr) {
  return arr.sort((a, b) => {
    const aBoosted = Number((a.boostedUntil || 0) > Date.now());
    const bBoosted = Number((b.boostedUntil || 0) > Date.now());
    return (bBoosted - aBoosted) || ((b.createdAt || 0) - (a.createdAt || 0));
  });
}

function renderFeed(
  mode = 'all',
  button = null
) {
  currentFeedMode = mode;

  const feed = $('#feed');

  if (!feed) return;

  if (button) {

    document
      .querySelectorAll('.pills .pill')
      .forEach(b =>
        b.classList.remove('active')
      );

    button.classList.add(
      'active'
    );
  }

  let arr =
    state.challenges.slice();

  if (mode === 'trending') {

    arr.sort(
      (a, b) =>
        featuredScore(b) -
        featuredScore(a)
    );

  } else if (mode === 'new') {

    sortFeedByBoostAndTime(arr);

  } else if (mode === 'friends') {

    arr = arr.filter(c => followingIds.has(c.creator));
    sortFeedByBoostAndTime(arr);

  } else {

    sortFeedByBoostAndTime(arr);
  }

  feed.innerHTML = '';

  if (!arr.length) {

    feed.innerHTML = `
      <div class="empty">
        No challenges found.
      </div>
    `;

    return;
  }

  arr.forEach(c => {

    feed.appendChild(
      challengeCard(c)
    );

  });
}


/* =========================
   MEDIA
========================= */

function mediaHTML(c) {

  if (
    c.media?.kind === 'image'
  ) {

    return `
      <img
        src="${c.media.data}"
        alt="challenge">
    `;
  }

  if (
    c.media?.kind === 'video'
  ) {

    return `
      <video
        src="${c.media.data}"
        controls
        playsinline>
      </video>
    `;
  }

  if (
    c.media?.kind === 'audio'
  ) {

    return `
      <audio
        src="${c.media.data}"
        controls>
      </audio>
    `;
  }

  return '';
}


/* =========================
   CHALLENGE CARD
========================= */

function challengeCard(c) {

  const n =
    $('#challengeCardTpl')
      .content
      .cloneNode(true);

  const article =
    n.querySelector(
      '.challenge-card'
    );
  if (article) article.dataset.challengeId = c.id;

  const topFeatured =
    getFeaturedChallenges(3)
      .some(
        x => x.id === c.id
      );

  if (topFeatured) {
    article.classList.add(
      'featured'
    );
  }

  n.querySelector(
    '.creatorName'
  ).textContent =
    c.creatorName;

  const cardAvatar=n.querySelector('.avatar');
  if(cardAvatar) cardAvatar.innerHTML=c.creatorAvatarUrl ? `<img src="${escapeAttr(c.creatorAvatarUrl)}" alt="${escapeAttr(c.creatorName||'BeatTag creator')} profile photo">` : escapeHTML((c.creatorName||'?')[0].toUpperCase());

  n.querySelector(
    '.meta'
  ).textContent =
    `${fmt(c.createdAt)} • Generation ${c.generation}${(c.boostedUntil || 0) > Date.now() ? ' • ⚡ Boosted' : ''}`;

  n.querySelector(
    '.challenge-title'
  ).textContent =
    c.title;

  const descriptionEl =
    n.querySelector('.challenge-description');

  if(descriptionEl){ const description=(c.text||'').trim(); descriptionEl.classList.toggle('hidden',!description); if(description){ descriptionEl.innerHTML=`<div class="challenge-description-text ${description.length>180?'collapsed':''}">${escapeHTML(description)}</div>${description.length>180?'<button type="button" class="read-more-btn">Read more</button>':''}`; const more=descriptionEl.querySelector('.read-more-btn'); if(more) more.onclick=()=>{const body=descriptionEl.querySelector('.challenge-description-text');const expanded=body.classList.toggle('expanded');body.classList.toggle('collapsed',!expanded);more.textContent=expanded?'Show less':'Read more';}; } }

  n.querySelector(
    '.media-wrap'
  ).innerHTML =
    mediaHTML(c);

  const creatorNameEl = n.querySelector('.creatorName');
  const avatarEl = n.querySelector('.avatar');

  const openCreatorProfile = () => {
    if (c.creator) renderPublicProfile(c.creator, c.creatorName);
  };

  if (creatorNameEl) {
    creatorNameEl.classList.add('profile-link');
    creatorNameEl.onclick = openCreatorProfile;
  }

  if (avatarEl) {
    avatarEl.classList.add('profile-link');
    avatarEl.onclick = openCreatorProfile;
  }

  const like =
    n.querySelector('.likeBtn');

  const dis =
    n.querySelector(
      '.dislikeBtn'
    );

  const pid =
    currentUserId || state.currentProfile;

  like.querySelector(
    'span'
  ).textContent =
    Object.keys(
      c.likes || {}
    ).length;

  dis.querySelector(
    'span'
  ).textContent =
    Object.keys(
      c.dislikes || {}
    ).length;

  n.querySelector(
    '.commentBtn span'
  ).textContent =
    (c.comments || []).length;

  like.classList.toggle(
    'active',
    !!c.likes?.[pid]
  );

  dis.classList.toggle(
    'active',
    !!c.dislikes?.[pid]
  );

  like.onclick =
    () =>
      react(
        c.id,
        'like'
      );

  dis.onclick =
    () =>
      react(
        c.id,
        'dislike'
      );

  n.querySelector(
    '.commentBtn'
  ).onclick =
    () =>
      openComments(c.id);

  n.querySelector(
    '.beatBtn'
  ).onclick =
    () =>
      openBeat(c.id);

  n.querySelector(
    '.tagBtn'
  ).onclick =
    () =>
      tagFriend(c.id);

  n.querySelector(
    '.shareBtn'
  ).onclick =
    () =>
      shareChallenge(c.id);
  n.querySelector(
  '.dots'
).onclick =
  () =>
    openChallengeMenu(c.id);

  const taggedNames =
  (c.tags || []).length
    ? ` • 👥 Tagged: ${c.tags.join(', ')}`
    : '';

const parentChallenge =
  c.parentId
    ? state.challenges.find(
        x => x.id === c.parentId
      )
    : null;

const parentText =
  parentChallenge
    ? ` • ↳ Beat: ${parentChallenge.title}`
    : '';

const chainline=n.querySelector('.chainline'); if(chainline){ chainline.innerHTML=`🔗 ${c.attempts||0} ${(c.attempts||0)===1?'attempt':'attempts'} • Generation ${c.generation}`; if(parentChallenge){const b=document.createElement('button');b.className='parent-challenge-link';b.textContent=`↳ Beat: ${parentChallenge.title}`;b.onclick=()=>openChallengeById(parentChallenge.id);chainline.append(' • ',b);} if((c.tags||[]).length) chainline.append(` • 👥 Tagged: ${(c.tags||[]).join(', ')}`);}
  return n;
}
function openChallengeById(id) {
  const c=state.challenges.find(x=>x.id===id);
  if(!c){toast('This challenge is no longer available.');return;}
  if(currentTab!=='home') go('home'); else renderHome();
  setTimeout(()=>{
    const safeId=(window.CSS&&CSS.escape)?CSS.escape(String(id)):String(id).replace(/"/g,'\\"');
    const card=document.querySelector(`.challenge-card[data-challenge-id="${safeId}"]`);
    if(!card){toast('Challenge loaded. Change the feed filter if it is hidden.');return;}
    card.scrollIntoView({behavior:'smooth',block:'center'});
    card.classList.add('challenge-focus');
    setTimeout(()=>card.classList.remove('challenge-focus'),1800);
  },140);
}

function openChallengeMenu(id) {

  const c =
    state.challenges.find(
      x => x.id === id
    );

  if (!c) return;

  const isMine =
    c.creator === currentUserId;

  modal.classList.remove('hidden');

  modalCard.innerHTML = `
    <div class="modal-head">
      <h3>Challenge Options</h3>

      <button
        class="close"
        onclick="closeModal()">
        ×
      </button>
    </div>

    <div style="
      display:flex;
      flex-direction:column;
      gap:10px;
      margin-top:15px;
    ">

      ${
        isMine
          ? `
            <button
              class="secondary"
              onclick="editChallenge('${c.id}')">
              ✏️ Edit Challenge
            </button>
          `
          : ''
      }

      ${c.media?.data ? `
        <button class="secondary" onclick="closeModal();downloadChallengeMedia('${c.id}')">⬇ Download ${c.media.kind === 'image' ? 'Photo' : c.media.kind === 'video' ? 'Video' : 'Audio'}</button>
      ` : ''}

      <button
        class="secondary"
        onclick="
          closeModal();
          shareChallenge('${c.id}');
        ">
        📤 Share Challenge
      </button>

      ${
        isMine
          ? `
            <button
              class="secondary"
              onclick="
                closeModal();
                deleteChallenge('${c.id}');
              ">
              🗑 Delete Challenge
            </button>
          `
          : `
            <button
              class="secondary"
              onclick="reportChallenge('${c.id}')">
              🚩 Report Challenge
            </button>
          `
      }

    </div>
  `;
}
async function editChallenge(id) {

  const c =
    state.challenges.find(
      x => x.id === id
    );

  if (!c) return;

  if (c.creator !== currentUserId) {
    toast('You can only edit your own challenge.');
    return;
  }

  const newTitle = await beatPrompt('Edit Challenge','Update your challenge title.',c.title,{confirmText:'Continue'});

  if (newTitle === null) return;

  const cleanTitle =
    newTitle.trim();

  if (!cleanTitle) {
    toast('Challenge title cannot be empty.');
    return;
  }

  const newText = await beatPrompt('Challenge Rules','Update the challenge message or rules.',c.text||'',{confirmText:'Save Changes',multiline:true});

  if (newText === null) return;

  try {

    const { error } =
      await supabaseClient
        .from('challenges')
        .update({
          title: cleanTitle,
          description: newText.trim()
        })
        .eq('id', id)
        .eq('creator_id', currentUserId);

    if (error) throw error;

    c.title = cleanTitle;
    c.text = newText.trim();

    save();

    closeModal();
    renderHome();

    toast('Challenge updated ✅');

  } catch (err) {

    console.error(
      'Edit challenge error:',
      err
    );

    toast(
      err.message ||
      'Could not edit the challenge.'
    );
  }
}


function reportChallenge(id) {

  const c = state.challenges.find(
    x => x.id === id
  );

  if (!c) return;

  if (c.creator === currentUserId) {
    closeModal();
    toast('You cannot report your own challenge.');
    return;
  }

  modal.classList.remove('hidden');

  modalCard.innerHTML = `
  <div style="
    background:linear-gradient(180deg,#17111f 0%,#100c17 100%);
    border:1px solid #7c3cff;
    border-radius:24px;
    padding:22px;
    box-shadow:0 0 30px rgba(179,60,255,.18);
  ">

    <div class="modal-head">
      <h3 style="
        margin:0;
        font-size:24px;
        display:flex;
        align-items:center;
        gap:10px;
      ">
        🚩 Report Challenge
      </h3>

      <button
        class="close"
        onclick="closeModal()"
        style="
          background:transparent;
          border:none;
          color:#fff;
          font-size:28px;
        ">
        ×
      </button>
    </div>

    <p style="
      margin:12px 0 16px;
      color:#b9afc6;
      line-height:1.5;
    ">
      Help us keep BeatTag safe and fun for everyone.
    </p>

    <div style="
      background:#181222;
      border:1px solid #332640;
      border-radius:16px;
      padding:14px;
      margin-bottom:20px;
      color:#c7bdd2;
      line-height:1.45;
    ">
      🟣 Your report is confidential. We'll review it and take action if it violates our guidelines.
    </div>

    <label style="
      display:block;
      color:#fff;
      font-weight:700;
      margin-bottom:8px;
    ">
      Reason for reporting <span style="color:#ff4d7d;">*</span>
    </label>

    <select
      id="reportReason"
      style="
        width:100%;
        background:#15101d;
        color:#fff;
        border:1px solid #8a4cff;
        border-radius:14px;
        padding:14px 16px;
        font-size:16px;
        outline:none;
        margin-bottom:18px;
      ">
      <option value="">Select reason</option>
      <option value="spam">🚫 Spam</option>
      <option value="harassment">💬 Harassment or Bullying</option>
      <option value="adult">🔞 Adult / Sexual Content</option>
      <option value="graphic">🩸 Graphic / Gore Content</option>
      <option value="inappropriate">⚠️ Inappropriate Content</option>
      <option value="dangerous">🚩 Harmful or Dangerous Challenge</option>
      <option value="other">••• Other</option>
    </select>

    <label style="
      display:block;
      color:#fff;
      font-weight:700;
      margin-bottom:8px;
    ">
      Additional details
      <span style="color:#8f859b;font-weight:400;">
        (optional)
      </span>
    </label>

    <textarea
      id="reportDetails"
      maxlength="200"
      placeholder="Tell us more about why you are reporting this challenge..."
      style="
        width:100%;
        min-height:120px;
        box-sizing:border-box;
        resize:vertical;
        background:#15101d;
        color:#fff;
        border:1px solid #4b3b5a;
        border-radius:14px;
        padding:14px;
        font-size:16px;
        line-height:1.5;
        outline:none;
        margin-bottom:18px;
      "></textarea>

    <button
      class="primary"
      style="
        width:100%;
        border:none;
        border-radius:16px;
        padding:16px;
        font-size:17px;
        font-weight:800;
        background:linear-gradient(90deg,#7b2cff,#ef24d5);
        color:#fff;
        box-shadow:0 8px 24px rgba(193,42,255,.25);
      "
      onclick="submitChallengeReport('${id}')">
      🚩 Submit Report
    </button>

  </div>
`;
}


async function submitChallengeReport(id) {

  const reason =
    document
      .getElementById('reportReason')
      ?.value;

  const details =
    document
      .getElementById('reportDetails')
      ?.value
      .trim();

  if (!reason) {
    toast('Select a report reason.');
    return;
  }

  if (!currentUserId) {
    toast('Please login first.');
    return;
  }

  try {

    const { error } =
      await supabaseClient
        .from('reports')
        .insert({
          challenge_id: id,
          reported_by: currentUserId,
          reason: reason,
          details: details || null
        });

    if (error) {

      if (error.code === '23505') {
        closeModal();
        toast('You have already reported this challenge.');
        return;
      }

      throw error;
    }

    closeModal();

    toast('Report submitted successfully 🚩');

  } catch (err) {

    console.error(
      'Report challenge error:',
      err
    );

    toast(
      err.message ||
      'Could not submit the report.'
    );
  }
}

async function deleteChallenge(id) {

  const challenge =
    state.challenges.find(
      c => c.id === id
    );

  if (!challenge) return;

  if (challenge.creator !== currentUserId) {
    toast('You can only delete your own challenge.');
    return;
  }

  const ok=await beatTagConfirm({title:'Delete Challenge',message:`Delete \"${challenge.title}\"? This action cannot be undone.`,confirmText:'Delete Challenge',danger:true});
  if(!ok)return;

  try {

    /* GET EXACT MEDIA URL FROM DATABASE */
    const {
      data: dbChallenge,
      error: fetchError
    } =
      await supabaseClient
        .from('challenges')
        .select('media_url')
        .eq('id', id)
        .eq('creator_id', currentUserId)
        .single();

    if (fetchError) throw fetchError;


    /* DELETE MEDIA FROM STORAGE */
    if (dbChallenge?.media_url) {

      const mediaUrl =
        dbChallenge.media_url;

      const marker =
        '/storage/v1/object/public/challenge-media/';

      const url =
        new URL(mediaUrl);

      const pathname =
        decodeURIComponent(url.pathname);

      const markerIndex =
        pathname.indexOf(marker);

      if (markerIndex === -1) {
        throw new Error(
          'Could not find the stored media path.'
        );
      }

      const filePath =
        pathname.substring(
          markerIndex + marker.length
        );

      console.log(
        'Deleting Storage file:',
        filePath
      );

      const {
        data: removedFiles,
        error: storageError
      } =
        await supabaseClient.storage
          .from('challenge-media')
          .remove([filePath]);

      if (storageError) {
        throw storageError;
      }

      console.log(
        'Storage deleted:',
        removedFiles
      );
    }


    /* DELETE DATABASE CHALLENGE */
    const { error: deleteError } =
      await supabaseClient
        .from('challenges')
        .delete()
        .eq('id', id)
        .eq('creator_id', currentUserId);

    if (deleteError) {
      throw deleteError;
    }


    /* REMOVE FROM LOCAL STATE */
    state.challenges =
      state.challenges.filter(
        c => c.id !== id
      );

    save();

    renderHome();

    toast(
      dbChallenge?.media_url
        ? 'Challenge + media deleted 🗑'
        : 'Challenge deleted 🗑'
    );

  } catch (err) {

    console.error(
      'Delete challenge error:',
      err
    );

    toast(
      err.message ||
      'Could not delete the challenge.'
    );
  }
}

/* =========================
   LIKE / DISLIKE
========================= */
async function react(id, type) {

  const c =
    state.challenges.find(
      x => x.id === id
    );

  if (!c) return;

  const scrollY =
    window.scrollY;

  try {

    const {
      data: { user },
      error: userError
    } =
      await supabaseClient.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!user) {
      toast('Please log in first.');
      return;
    }

    const {
      data: existing,
      error: checkError
    } =
      await supabaseClient
        .from('reactions')
        .select('*')
        .eq('challenge_id', id)
        .eq('user_id', user.id)
        .maybeSingle();

    if (checkError) {
      throw checkError;
    }

    if (
      existing &&
      existing.reaction_type === type
    ) {

      const { error: deleteError } =
        await supabaseClient
          .from('reactions')
          .delete()
          .eq('challenge_id', id)
          .eq('user_id', user.id);

      if (deleteError) {
        throw deleteError;
      }

    } else {

      const { error: upsertError } =
        await supabaseClient
          .from('reactions')
          .upsert(
            {
              challenge_id: id,
              user_id: user.id,
              reaction_type: type
            },
            {
              onConflict:
                'challenge_id,user_id'
            }
          );

      if (upsertError) {
        throw upsertError;
      }
    }

    await loadReactionsFromSupabase();

    renderHome();

    requestAnimationFrame(() => {
      window.scrollTo(
        0,
        scrollY
      );
    });

  } catch (err) {

    console.error(
      'Reaction error:',
      err
    );

    toast(
      err.message ||
      'Could not save your reaction.'
    );
  }
}

/* =========================
   FEATURED PAGE
========================= */

function renderFeatured() {

  const arr =
    getFeaturedChallenges(
      state.challenges.length
    );

  screenEl.innerHTML = `

    <div class="section-title">

      <h2>
        ⭐ Featured
      </h2>

      <span class="muted">
        Top challenges
      </span>

    </div>

    <section class="panel">

      <strong>
        How Featured works
      </strong>

      <p class="muted">
        Top challenges are ranked using likes, comments, attempts and challenge-chain growth.
      </p>

    </section>

    <div id="featuredFeed"></div>
  `;

  const feed =
    $('#featuredFeed');

  if (!arr.length) {

    feed.innerHTML = `
      <div class="empty">
        No featured challenges yet.
      </div>
    `;

    return;
  }

  arr.forEach(
    (c, index) => {

      const rank =
        document.createElement(
          'div'
        );

      rank.innerHTML = `
        <div
          class="featured-badge"
          style="margin-bottom:8px">
          ⭐ #${index + 1} Featured
          • Score ${featuredScore(c)}
        </div>
      `;

      feed.appendChild(rank);

      feed.appendChild(
        challengeCard(c)
      );
    }
  );
}


/* =========================
   EXPLORE
========================= */

function renderExplore() {

  screenEl.innerHTML = `
    <div class="explore-heading">
      <div>
        <div class="eyebrow">DISCOVER BEATTAG</div>
        <h2>Explore</h2>
        <p>Find creators, challenges and the next chain worth beating.</p>
      </div>
      <button class="leaderboard-quick-btn" onclick="renderLeaderboard()">
        <span>♕</span>
        <span><strong>Leaderboard</strong><small>Top creators</small></span>
        <b>›</b>
      </button>
    </div>

    <div class="search-shell">
      <span class="search-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
      </span>
      <input id="search" autocomplete="off" placeholder="Search challenges or creators..." aria-label="Search BeatTag">
      <button class="search-clear hidden" id="searchClear" type="button" aria-label="Clear search">×</button>
    </div>

    <div class="pills explore-filters">
      <button class="pill active" data-filter="all">All</button>
      <button class="pill" data-filter="people">Creators</button>
      <button class="pill" data-filter="photo">Photo</button>
      <button class="pill" data-filter="video">Video</button>
      <button class="pill" data-filter="audio">Audio</button>
      <button class="pill" data-filter="text">Text</button>
    </div>

    <div id="results"></div>
  `;

  const search = $('#search');
  const clear = $('#searchClear');

  search.addEventListener('input', () => {
    clear.classList.toggle('hidden', !search.value);
    clearTimeout(exploreSearchTimer);
    exploreSearchTimer = setTimeout(() => doSearch(), 140);
  });

  clear.onclick = () => {
    search.value = '';
    clear.classList.add('hidden');
    search.focus();
    doSearch();
  };

  document.querySelectorAll('[data-filter]').forEach(b => {
    b.onclick = () => {
      document.querySelectorAll('[data-filter]').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      doSearch(b.dataset.filter);
    };
  });

  doSearch('all');
}

async function doSearch(typeFilter = null) {
  const requestToken = ++searchRequestToken;
  const q = ($('#search')?.value || '').trim().toLowerCase();
  const active = document.querySelector('[data-filter].active');
  const filter = typeFilter || active?.dataset.filter || 'all';
  const out = $('#results');
  if (!out) return;

  const challengeMatches = state.challenges.filter(c => {
    const haystack = `${c.title} ${c.text || ''} ${c.creatorName || ''}`.toLowerCase();
    const textMatch = !q || haystack.includes(q);
    const typeMatch = filter === 'all' || filter === 'people' ? true : c.type === filter;
    return textMatch && typeMatch && filter !== 'people';
  });

  let people = [];
  if (filter === 'all' || filter === 'people') {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('id,name,username,bio,avatar_url')
        .limit(80);
      if (error) throw error;

      if (requestToken !== searchRequestToken) return;

      people = (data || []).filter(person => {
        if (!q) return filter === 'people';
        const haystack = `${person.name || ''} ${person.username || ''} ${person.bio || ''}`.toLowerCase();
        return haystack.includes(q);
      }).slice(0, q ? 12 : 8);
    } catch (err) {
      console.warn('Creator search unavailable:', err?.message || err);
    }
  }

  out.innerHTML = '';

  if (people.length) {
    const section = document.createElement('section');
    section.className = 'search-people-section';
    section.innerHTML = `<div class="search-result-heading"><strong>Creators</strong><span>${people.length}</span></div>`;
    const grid = document.createElement('div');
    grid.className = 'creator-search-list';

    people.forEach(person => {
      const name = person.name || person.username || 'BeatTag User';
      const username = person.username ? '@' + String(person.username).replace(/^@/, '') : '';
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'creator-search-row';
      row.onclick = () => renderPublicProfile(person.id, name);
      row.innerHTML = `
        <span class="creator-search-avatar">${person.avatar_url ? `<img src="${escapeAttr(person.avatar_url)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">` : (escapeHTML(name)[0] || 'B')}</span>
        <span class="creator-search-copy">
          <strong>${escapeHTML(name)}</strong>
          <small>${escapeHTML(username || 'BeatTag creator')}</small>
        </span>
        ${person.id !== currentUserId ? `<span class="creator-follow-state">${isFollowing(person.id) ? 'Following' : 'View'}</span>` : '<span class="creator-follow-state">You</span>'}
        <span class="creator-search-arrow">›</span>
      `;
      grid.appendChild(row);
    });

    section.appendChild(grid);
    out.appendChild(section);
  }

  if (challengeMatches.length) {
    const heading = document.createElement('div');
    heading.className = 'search-result-heading challenge-result-heading';
    heading.innerHTML = `<strong>Challenges</strong><span>${challengeMatches.length}</span>`;
    out.appendChild(heading);
    challengeMatches.forEach(c => out.appendChild(challengeCard(c)));
  }

  if (!people.length && !challengeMatches.length) {
    out.innerHTML = `
      <div class="empty premium-empty">
        <span>⌕</span>
        <strong>No results found</strong>
        <small>Try another creator name, keyword or challenge type.</small>
      </div>
    `;
  }
}


/* =========================
   CREATE
========================= */

function renderCreate(
  parentId = null
) {

  currentType = 'text';

  captureBlob = null;
  captureUrl = '';

  screenEl.innerHTML = `

    <div class="section-title">

      <h2>
        ${
          parentId
            ? 'Beat this challenge'
            : 'Create Challenge'
        }
      </h2>

    </div>

    <section class="panel">

      <div class="type-tabs">

        <button
          class="active"
          data-type="text">
          Text
        </button>

        <button
          data-type="photo">
          Photo
        </button>

        <button
          data-type="video">
          Video
        </button>

        <button
          data-type="audio">
          Audio
        </button>

      </div>

      <div class="field">

        <label>
          Challenge title
        </label>

        <input
          id="titleInput"
          maxlength="120"
          oninput="updateCreateCounters();saveCreateDraft()"
          placeholder="Can you beat this?">
        <div id="titleCount" class="field-hint">0/120</div>

      </div>

      <div class="field">

        <label>
          Message / rules
        </label>

        <textarea
          id="textInput"
          maxlength="1500"
          oninput="updateCreateCounters();saveCreateDraft()"
          placeholder="Explain the challenge..."></textarea>
        <div id="textCount" class="field-hint">0/1500</div>
        <div id="createValidation" class="inline-message"></div>

      </div>

      <div id="captureArea"></div>

      <div class="field">

        <label>
          Tag friends
        </label>

        <input
          id="tagInput"
          placeholder="Optional: tag creators after publishing">

      </div>

      <div class="create-action-row">
        <button class="secondary" type="button" onclick="previewChallengeDraft()">Preview</button>
      <button
        class="primary"
        style="flex:1"
        id="postBtn">

        ${
          parentId
            ? '🔥 Post Attempt'
            : '🚀 Publish Challenge'
        }

      </button>
      </div>

    </section>
  `;

  document
    .querySelectorAll(
      '.type-tabs button'
    )
    .forEach(b => {

      b.onclick = () => {

        document
          .querySelectorAll(
            '.type-tabs button'
          )
          .forEach(
            x =>
              x.classList.remove(
                'active'
              )
          );

        b.classList.add(
          'active'
        );

        currentType =
          b.dataset.type;

        renderCapture();
      };

    });

  $('#postBtn').onclick =
    () =>
      publishChallenge(
        parentId
      );

  restoreCreateDraft(parentId);
  updateCreateCounters();
  renderCapture();
}


/* =========================
   CAMERA / CHOOSE FILE
========================= */

function renderCapture() {

  const a =
    $('#captureArea');

  if (!a) return;

  if (
    currentType === 'text'
  ) {

    a.innerHTML = '';

    stopStream();

    return;
  }

  const accept =
    currentType === 'photo'
      ? 'image/*'
      : currentType === 'video'
      ? 'video/*'
      : 'audio/*';

  a.innerHTML = `

    <div class="capture-box">

      <strong>
        ${
          currentType === 'photo'
            ? '📷 Photo'
            : currentType === 'video'
            ? '🎥 Video'
            : '🎙 Audio'
        }
      </strong>

      <div class="field-hint media-limit-hint">
        ${currentType === 'photo' ? 'JPG, PNG or WebP • max 10MB' : currentType === 'video' ? 'MP4 or WebM • max 50MB' : 'MP3, WAV or WebM • max 20MB'}
      </div>

      <div class="capture-actions">

        ${
          currentType !== 'audio'
            ? `
              <button
                type="button"
                class="secondary"
                onclick="openCamera('${currentType}')">
                Open Camera
              </button>
            `
            : `
              <button
                type="button"
                class="secondary"
                id="audioRecordBtn"
                onclick="toggleAudioRecord()">
                Start Recording
              </button>
            `
        }

        <button
          type="button"
          class="secondary"
          id="chooseFileBtn">
          Choose File
        </button>

        <input
          id="filePick"
          type="file"
          accept="${accept}"
          hidden>

      </div>

      <div
        class="capture-preview"
        id="preview">
      </div>

    </div>
  `;

  const chooseFileBtn =
    $('#chooseFileBtn');

  const filePick =
    $('#filePick');

  if (
    chooseFileBtn &&
    filePick
  ) {

    chooseFileBtn.onclick =
      () => {
        filePick.click();
      };

    filePick.onchange =
      e => {

        const file =
          e.target.files &&
          e.target.files[0];

        if (file) {

          fileChosen(file);

        }
      };
  }
}


/* =========================
   CAMERA
========================= */

async function openCamera(kind, facing = cameraFacingMode) {

  stopStream();
  activeCameraKind = kind;
  cameraFacingMode = facing;

  try {

    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {

      toast(
        'Camera is not available in this browser.'
      );

      return;
    }

    stream =
      await navigator
        .mediaDevices
        .getUserMedia({
          video: {
            facingMode: { ideal: cameraFacingMode }
          },
          audio:
            kind === 'video'
        });

    const p =
      $('#preview');

    p.innerHTML = `

      <video
        id="liveCam"
        autoplay
        playsinline
        muted>
      </video>

      <div class="capture-actions">

        <button type="button" class="secondary" onclick="switchBeatTagCamera()">🔄 Front / Back</button>

        <button
          class="primary"
          id="snapBtn">

          ${
            kind === 'photo'
              ? '📸 Take Photo'
              : '🔴 Start Video'
          }

        </button>

      </div>
    `;

    $('#liveCam').srcObject =
      stream;

    if (
      kind === 'photo'
    ) {

      $('#snapBtn').onclick =
        takePhoto;

    } else {

      $('#snapBtn').onclick =
        startVideoRecord;
    }

  } catch (e) {

    console.error(e);

    toast(
      'Allow camera permission or use Choose File.'
    );
  }
}

function takePhoto() {

  const v =
    $('#liveCam');

  if (!v) return;

  const c =
    document.createElement(
      'canvas'
    );

  c.width =
    v.videoWidth || 720;

  c.height =
    v.videoHeight || 1280;

  c.getContext('2d')
    .drawImage(
      v,
      0,
      0,
      c.width,
      c.height
    );

  c.toBlob(
    async b => {

      captureBlob = b;

      captureUrl =
        await blobToDataURL(b);

      stopStream();

      showCaptured(
        'image'
      );

    },
    'image/jpeg',
    0.82
  );
}


/* =========================
   VIDEO
========================= */

function startVideoRecord() {

  if (!stream) {

    toast(
      'Could not start the camera.'
    );

    return;
  }

  if (
    typeof MediaRecorder ===
    'undefined'
  ) {

    toast(
      'This browser does not support video recording. Use Choose File instead.'
    );

    return;
  }

  chunks = [];

  recorder =
    new MediaRecorder(stream);

  recorder.ondataavailable =
    e => {

      if (e.data.size) {

        chunks.push(e.data);

      }
    };

  recorder.onstop =
    async () => {

      captureBlob =
        new Blob(
          chunks,
          {
            type:
              recorder.mimeType ||
              'video/webm'
          }
        );

      captureUrl =
        await blobToDataURL(
          captureBlob
        );

      stopStream();

      showCaptured(
        'video'
      );
    };

  recorder.start();

  const btn =
    $('#snapBtn');

  btn.textContent =
    '⏹ Stop Video';

  btn.onclick =
    () => {

      if (
        recorder &&
        recorder.state ===
          'recording'
      ) {

        recorder.stop();

      }
    };
}


/* =========================
   AUDIO
========================= */

async function toggleAudioRecord() {

  if (
    recorder &&
    recorder.state ===
      'recording'
  ) {

    recorder.stop();

    return;
  }

  try {

    stream =
      await navigator
        .mediaDevices
        .getUserMedia({
          audio: true
        });

    chunks = [];

    recorder =
      new MediaRecorder(stream);

    recorder.ondataavailable =
      e => {

        if (e.data.size) {

          chunks.push(e.data);

        }
      };

    recorder.onstop =
      async () => {

        captureBlob =
          new Blob(
            chunks,
            {
              type:
                recorder.mimeType ||
                'audio/webm'
            }
          );

        captureUrl =
          await blobToDataURL(
            captureBlob
          );

        stopStream();

        showCaptured(
          'audio'
        );
      };

    recorder.start();

    const btn =
      $('#audioRecordBtn');

    if (btn) {

      btn.textContent =
        '⏹ Stop Recording';

    }

    toast(
      'Recording started 🎙'
    );

  } catch (e) {

    toast(
      'Allow microphone permission.'
    );
  }
}


/* =========================
   CHOOSE FILE
========================= */

function validateMediaFile(file, kind=currentType) {
  const rule = MEDIA_LIMITS[kind];
  if (!file || !rule) return { ok:false, message:'Choose a valid media file.' };
  const type=(file.type||'').toLowerCase().split(';')[0].trim();
  const name=(file.name||'').toLowerCase();
  const ext=name.includes('.') ? name.split('.').pop() : '';
  const allowedExt={photo:['jpg','jpeg','png','webp'],video:['mp4','webm','mov','m4v','3gp'],audio:['mp3','mpeg','wav','webm','m4a','aac','ogg','3gp']}[kind]||[];
  const mimeOk=rule.types.includes(type) || (kind==='video' && type.startsWith('video/')) || (kind==='audio' && type.startsWith('audio/')) || (kind==='photo' && type.startsWith('image/'));
  if (!mimeOk && !allowedExt.includes(ext)) return { ok:false, message:`Unsupported ${kind} format. Choose a supported file.` };
  if (file.size > rule.maxBytes) return { ok:false, message:`File is too large. Use a file smaller than ${rule.label}.` };
  return { ok:true };
}

function fileChosen(f) {
  if (!f) return;
  const check=validateMediaFile(f,currentType);
  if(!check.ok){ toast(check.message); return; }

  if (captureUrl && captureUrl.startsWith('blob:')) URL.revokeObjectURL(captureUrl);
  captureBlob = f;
  captureUrl = URL.createObjectURL(f);
  showCaptured(currentType === 'photo' ? 'image' : currentType);
}

function showCaptured(kind) {

  const p =
    $('#preview');

  if (!p) return;

  if (
    kind === 'image'
  ) {

    p.innerHTML = `
      <img
        src="${captureUrl}"
        alt="Selected">
    `;

  } else if (
    kind === 'video'
  ) {

    p.innerHTML = `
      <video
        src="${captureUrl}"
        controls
        playsinline>
      </video>
    `;

  } else {

    p.innerHTML = `
      <audio
        src="${captureUrl}"
        controls>
      </audio>
    `;
  }

  p.insertAdjacentHTML('beforeend', `
    <div class="capture-actions capture-selected-actions">
      <button type="button" class="secondary" onclick="document.getElementById('filePick')?.click()">Replace</button>
      <button type="button" class="ghost" onclick="clearCapturedMedia()">Remove</button>
    </div>
  `);
}

function blobToDataURL(b) {

  return new Promise(
    res => {

      const r =
        new FileReader();

      r.onload =
        () =>
          res(r.result);

      r.readAsDataURL(b);
    }
  );
}

function stopStream() {

  if (stream) {

    stream
      .getTracks()
      .forEach(
        t => t.stop()
      );

    stream = null;
  }
}

async function uploadChallengeMedia(file) {

  if (!file) return null;

  if (!currentUserId) {
    throw new Error('User is not logged in.');
  }

  const mime = file.type || '';

  let extension = 'bin';

  if (mime.includes('jpeg')) extension = 'jpg';
  else if (mime.includes('png')) extension = 'png';
  else if (mime.includes('webp')) extension = 'webp';
  else if (mime.includes('mp4')) extension = 'mp4';
  else if (mime.includes('webm')) extension = 'webm';
  else if (mime.includes('mpeg')) extension = 'mp3';
  else if (mime.includes('wav')) extension = 'wav';

  const filePath =
    `${currentUserId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } =
    await supabaseClient.storage
      .from('challenge-media')
      .upload(
        filePath,
        file,
        {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        }
      );

  if (uploadError) {
    throw uploadError;
  }

  const { data } =
    supabaseClient.storage
      .from('challenge-media')
      .getPublicUrl(filePath);

  if (!data?.publicUrl) {
    throw new Error('Could not get the media URL.');
  }

  return { url: data.publicUrl, path: filePath };
}


function updateCreateCounters() {
  const title = $('#titleInput');
  const text = $('#textInput');
  const titleCount = $('#titleCount');
  const textCount = $('#textCount');
  if (title && titleCount) titleCount.textContent = `${title.value.length}/120`;
  if (text && textCount) textCount.textContent = `${text.value.length}/1500`;
}

function saveCreateDraft() {
  try {
    sessionStorage.setItem('beattag_create_draft', JSON.stringify({
      title: $('#titleInput')?.value || '',
      text: $('#textInput')?.value || ''
    }));
  } catch (_) {}
}

function restoreCreateDraft(parentId) {
  if (parentId) return;
  try {
    const draft = JSON.parse(sessionStorage.getItem('beattag_create_draft') || 'null');
    if (!draft) return;
    if ($('#titleInput') && !$('#titleInput').value) $('#titleInput').value = draft.title || '';
    if ($('#textInput') && !$('#textInput').value) $('#textInput').value = draft.text || '';
  } catch (_) {}
}

function clearCapturedMedia() {
  if (captureUrl && captureUrl.startsWith('blob:')) {
    try { URL.revokeObjectURL(captureUrl); } catch (_) {}
  }
  captureBlob = null;
  captureUrl = '';
  stopStream();
  renderCapture();
}

function previewChallengeDraft() {
  const title = ($('#titleInput')?.value || '').trim();
  const text = ($('#textInput')?.value || '').trim();

  if (!title) {
    const validation = $('#createValidation');
    if (validation) validation.textContent = 'Enter a challenge title before previewing.';
    return;
  }

  modal.classList.remove('hidden');
  modalCard.innerHTML = `
    <div class="modal-head">
      <h3>Challenge Preview</h3>
      <button class="close" onclick="closeModal()">×</button>
    </div>
    <article class="challenge-card preview-challenge-card">
      <div class="card-head">
        <div class="avatar">${profile().avatarUrl ? `<img src="${escapeAttr(profile().avatarUrl)}" alt="">` : escapeHTML((profile().name || 'B')[0])}</div>
        <div class="userline"><strong>${escapeHTML(profile().name || 'BeatTag User')}</strong><span class="meta">Preview • Generation 1</span></div>
      </div>
      <div class="challenge-title">${escapeHTML(title)}</div>
      ${text ? `<div class="challenge-description">${escapeHTML(text)}</div>` : ''}
      ${captureUrl ? `<div class="media-wrap">${currentType === 'photo' ? `<img src="${escapeAttr(captureUrl)}" alt="Preview">` : currentType === 'video' ? `<video src="${escapeAttr(captureUrl)}" controls playsinline></video>` : currentType === 'audio' ? `<audio src="${escapeAttr(captureUrl)}" controls></audio>` : ''}</div>` : ''}
    </article>
  `;
}

/* =========================
   PUBLISH
========================= */

async function publishChallenge(parentId) {

  const title =
    $('#titleInput')
      .value
      .trim();

  const text =
    $('#textInput')
      .value
      .trim();

  if (!title) { toast('Enter a challenge title.'); return; }
  if (!text) { toast('Enter challenge message / rules.'); $('#textInput')?.focus(); return; }
  if (title.length > MAX_TITLE_LENGTH) { toast(`Keep the title under ${MAX_TITLE_LENGTH} characters.`); return; }
  if (text.length > MAX_DESCRIPTION_LENGTH) { toast(`Keep the description under ${MAX_DESCRIPTION_LENGTH} characters.`); return; }
  if (currentType !== 'text' && !captureBlob) { toast('Add a photo, video or audio file.'); return; }
  if (currentType !== 'text') {
    const check=validateMediaFile(captureBlob,currentType);
    if(!check.ok){ toast(check.message); return; }
  }
  if (isPublishingChallenge) return;
  isPublishingChallenge = true;

  let mediaUrl = null;
  let uploadedMediaPath = '';
  const postBtn = $('#postBtn');
  if (postBtn) { postBtn.disabled = true; postBtn.textContent = 'Posting...'; }

  try {
    if (currentType !== 'text' && captureBlob) {
      toast('Uploading media...');
      const uploaded = await uploadChallengeMedia(captureBlob);
      mediaUrl = uploaded.url;
      uploadedMediaPath = uploaded.path;
    }

    /* Logged-in Supabase user */
    const {
      data: { user },
      error: userError
    } =
      await supabaseClient.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!user) {
      toast('Please log in first.');
      showAuthScreen();
      return;
    }

    /* Local parent challenge */
    const parent =
      parentId
        ? state.challenges.find(
            c => c.id === parentId
          )
        : null;

    const generation =
      parent
        ? (parent.generation || 1) + 1
        : 1;

    /* Supabase UUID check */
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    const realParentId =
      parentId &&
      uuidRegex.test(parentId)
        ? parentId
        : null;

    /* Save real challenge in Supabase */
    const {
      data: newChallenge,
      error: insertError
    } =
      await supabaseClient
        .from('challenges')
        .insert({
          creator_id: user.id,
          parent_id: realParentId,
          title: title,
          description: text,
          challenge_type: currentType,
          media_url: mediaUrl,
          generation: generation,
          attempts_count: 0,
          views_count: 0,
          status: 'active'
        })
        .select()
        .single();

    if (insertError) {
      throw insertError;
    }

    /* Local UI copy */
    const c = {

      id: newChallenge.id,

      creator: user.id,

      creatorName:
        profile().name,

      title: newChallenge.title,

      type:
        newChallenge.challenge_type,

      text:
        newChallenge.description || '',

      createdAt:
        new Date(
          newChallenge.created_at
        ).getTime(),

      parentId:
        newChallenge.parent_id,

      generation:
        newChallenge.generation || 1,

      likes: {},

      dislikes: {},

      comments: [],

      attempts:
        newChallenge.attempts_count || 0,

      tags:
        ($('#tagInput')?.value || '')
          .split(',')
          .map(x => x.trim())
          .filter(Boolean),

      media: mediaUrl
  ? {
      kind:
        currentType === 'photo'
          ? 'image'
          : currentType,
      data: mediaUrl
    }
  : null
    };

    state.challenges.unshift(c);

    /* Secure server-side reward. The RPC validates ownership and prevents duplicate rewards. */
    let reward = 0;
    try {
      const {data:rewardData,error:rewardError}=await supabaseClient.rpc('award_challenge_reward',{target_challenge_id:newChallenge.id});
      if(rewardError) throw rewardError;
      const rewardResult=Array.isArray(rewardData)?rewardData[0]:rewardData;
      reward=Number(rewardResult?.reward||0);
      if(rewardResult?.coins!==undefined) profile().coins=Number(rewardResult.coins);
    } catch (rewardError) {
      console.warn('Challenge reward unavailable:', rewardError);
      // Posting must still succeed if a reward service is temporarily unavailable.
    }

    if (parent) {

  // The database trigger increments the parent's attempt counter atomically.
  parent.attempts = (parent.attempts || 0) + 1;

  state.notifications.unshift({
        text:
          reward > 0 ? `Attempt posted. +${reward} coins 🔥` : 'Attempt posted 🔥',
        time:
          Date.now(),
        read:
          false
      });

    } else {

      state.notifications.unshift({
        text:
          reward > 0 ? `Challenge created. +${reward} coins 🪙` : 'Challenge created 🔥',
        time:
          Date.now(),
        read:
          false
      });
    }

    save();

    captureBlob = null;
    captureUrl = '';
    sessionStorage.removeItem('beattag_create_draft');

    toast(
      'Challenge posted 🔥'
    );

    go('home');

  } catch (error) {

    if (uploadedMediaPath) {
      try { await supabaseClient.storage.from('challenge-media').remove([uploadedMediaPath]); } catch (_) {}
    }
    console.error(
      'Publish error:',
      error
    );

    toast(
      error.message ||
      'Could not post the challenge.'
    );

  } finally {
    isPublishingChallenge = false;

    if (postBtn) {
      postBtn.disabled = false;

      postBtn.textContent =
        parentId
          ? '🔥 Post Attempt'
          : '🚀 Publish Challenge';
    }
  }
}


/* =========================
   BEAT
========================= */

function openBeat(id) {

  renderCreate(id);
}


/* =========================
   COMMENTS
========================= */

function openComments(id) {
  const c = state.challenges.find(x => x.id === id);
  if (!c) return;

  modal.classList.remove('hidden');
  const comments = c.comments || [];

  modalCard.innerHTML = `
    <div class="modal-head">
      <h3>Comments <span class="muted">(${comments.length})</span></h3>
      <button class="close" onclick="closeModal()">×</button>
    </div>

    <div id="commentList" class="comment-list">
      ${
        comments.length
          ? comments.map(x => {
              const mine = x.profile === currentUserId;
              const avatar = x.avatarUrl
                ? `<img src="${escapeAttr(x.avatarUrl)}" alt="">`
                : escapeHTML((x.name || 'B')[0] || 'B');

              return `
                <div class="comment comment-rich" data-comment-id="${escapeAttr(x.id || '')}">
                  <button class="comment-user" ${x.profile ? `onclick="closeModal();renderPublicProfile('${escapeAttr(x.profile)}','${escapeAttr(x.name)}')"` : ''}>
                    <span class="mini-avatar">${avatar}</span>
                    <span class="comment-user-meta">
                      <strong>${escapeHTML(x.name)}</strong>
                      ${x.handle ? `<small>${escapeHTML(x.handle)} • ${fmt(x.time)}</small>` : `<small>${fmt(x.time)}</small>`}
                    </span>
                  </button>
                  <div class="comment-body">${escapeHTML(x.text)}</div>
                  ${mine && x.id ? `
                    <div class="comment-actions">
                      <button type="button" onclick="editComment('${escapeAttr(id)}','${escapeAttr(x.id)}')">Edit</button>
                      <button type="button" class="danger-text" onclick="deleteComment('${escapeAttr(id)}','${escapeAttr(x.id)}')">Delete</button>
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')
          : `<div class="empty">No comments yet.</div>`
      }
    </div>

    <div class="field comment-compose">
      <textarea id="commentText" maxlength="500" placeholder="Write a comment..." oninput="updateCommentCounter()"></textarea>
      <div id="commentCounter" class="field-hint">0/500</div>
    </div>

    <button id="commentPostBtn" class="primary" style="width:100%" onclick="addComment('${escapeAttr(id)}')">
      Post Comment
    </button>
  `;
}

function updateCommentCounter() {
  const field = $('#commentText');
  const counter = $('#commentCounter');
  if (field && counter) counter.textContent = `${field.value.length}/500`;
}

let isPostingComment = false;
async function addComment(id) {
  const field = $('#commentText');
  const button = $('#commentPostBtn');
  if (!field || isPostingComment) return;

  const txt = field.value.trim();
  if (!txt) return toast('Enter a comment.');
  if (txt.length > 500) return toast('Comment can contain up to 500 characters.');

  try {
    isPostingComment = true;
    if (button) { button.disabled = true; button.textContent = 'Posting…'; }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('Please log in first.');

    const { error } = await supabaseClient.from('comments').insert({
      challenge_id: id,
      user_id: user.id,
      comment_text: txt
    });
    if (error) throw error;

    await loadCommentsFromSupabase();
    openComments(id);
  } catch (err) {
    console.error('Comment error:', err);
    toast(err.message || 'Could not save the comment.');
  } finally {
    isPostingComment = false;
    if (button) { button.disabled = false; button.textContent = 'Post Comment'; }
  }
}

async function editComment(challengeId, commentId) {
  const c = state.challenges.find(x => x.id === challengeId);
  const comment = c?.comments?.find(x => x.id === commentId);
  if (!comment || comment.profile !== currentUserId) return;

  const next = await beatPrompt('Edit Comment','Update your comment.',comment.text||'',{confirmText:'Save',multiline:true});
  if (next === null) return;
  const clean = next.trim();
  if (!clean) return toast('Comment cannot be empty.');
  if (clean.length > 500) return toast('Comment can contain up to 500 characters.');

  try {
    const { error } = await supabaseClient.from('comments')
      .update({ comment_text: clean })
      .eq('id', commentId)
      .eq('user_id', currentUserId);
    if (error) throw error;
    await loadCommentsFromSupabase();
    openComments(challengeId);
    toast('Comment updated ✅');
  } catch (err) {
    toast(err.message || 'Could not edit the comment.');
  }
}

async function deleteComment(challengeId, commentId) {
  if (!(await beatConfirm('Delete Comment','This comment will be permanently removed.','Delete',true))) return;
  try {
    const { error } = await supabaseClient.from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', currentUserId);
    if (error) throw error;
    await loadCommentsFromSupabase();
    openComments(challengeId);
    toast('Comment deleted.');
  } catch (err) {
    toast(err.message || 'Could not delete the comment.');
  }
}

function closeModal() {

  modal.classList.add(
    'hidden'
  );

  stopStream();
}


/* =========================
   TAG FRIEND
========================= */

let selectedTagUser = null;
let tagSearchTimer = null;

function tagFriend(id) {
  const c = state.challenges.find(x => x.id === id);
  if (!c) return;

  selectedTagUser = null;
  modal.classList.remove('hidden');

  modalCard.innerHTML = `
    <div class="modal-head">
      <h3>Tag a Friend</h3>
      <button class="close" onclick="closeModal()">×</button>
    </div>

    <p class="muted">Search BeatTag creators by name or @handle.</p>

    <div class="field">
      <input id="friendSearch" autocomplete="off" placeholder="Search name or @handle" oninput="searchTagUsers('${escapeAttr(id)}')">
      <div id="tagSearchResults" class="tag-search-results"></div>
    </div>

    <div id="selectedTagUserBox" class="selected-tag-user hidden"></div>

    <div class="tag-share-actions">
      <button id="tagConfirmBtn" class="primary" disabled onclick="confirmTag('${escapeAttr(id)}')">Tag Friend</button>
      <button class="secondary" onclick="closeModal();shareChallenge('${escapeAttr(id)}')">Share Challenge</button>
    </div>
  `;
}

function searchTagUsers(challengeId) {
  const input = $('#friendSearch');
  const results = $('#tagSearchResults');
  if (!input || !results) return;

  clearTimeout(tagSearchTimer);
  const q = input.value.trim().replace(/^@/, '').toLowerCase();

  if (q.length < 2) {
    results.innerHTML = '<div class="field-hint">Type at least 2 characters.</div>';
    return;
  }

  results.innerHTML = '<div class="field-hint">Searching…</div>';

  tagSearchTimer = setTimeout(async () => {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('id,name,username,avatar_url')
        .or(`username.ilike.%${q}%,name.ilike.%${q}%`)
        .limit(8);

      if (error) throw error;

      const users = (data || []).filter(u => u.id !== currentUserId);
      results.innerHTML = users.length ? users.map(u => `
        <button type="button" class="tag-result-row" onclick="selectTagUser('${escapeAttr(u.id)}','${escapeAttr(u.name || u.username || 'BeatTag User')}','${escapeAttr(u.username || '')}','${escapeAttr(u.avatar_url || '')}')">
          <span class="mini-avatar">${u.avatar_url ? `<img src="${escapeAttr(u.avatar_url)}" alt="">` : escapeHTML((u.name || u.username || 'B')[0])}</span>
          <span><strong>${escapeHTML(u.name || u.username || 'BeatTag User')}</strong><small>@${escapeHTML(String(u.username || 'user').replace(/^@/,''))}</small></span>
        </button>
      `).join('') : '<div class="empty compact-empty">No creators found.</div>';
    } catch (err) {
      results.innerHTML = '<div class="field-hint field-error">Could not search creators.</div>';
    }
  }, 300);
}

function selectTagUser(id, name, username, avatarUrl) {
  selectedTagUser = { id, name, username, avatarUrl };
  const box = $('#selectedTagUserBox');
  const button = $('#tagConfirmBtn');
  if (box) {
    box.classList.remove('hidden');
    box.innerHTML = `
      <span class="mini-avatar">${avatarUrl ? `<img src="${escapeAttr(avatarUrl)}" alt="">` : escapeHTML((name || 'B')[0])}</span>
      <span><strong>${escapeHTML(name)}</strong><small>@${escapeHTML(String(username || 'user').replace(/^@/,''))}</small></span>
      <button type="button" class="ghost small-btn" onclick="selectedTagUser=null;document.getElementById('selectedTagUserBox').classList.add('hidden');document.getElementById('tagConfirmBtn').disabled=true;">Remove</button>
    `;
  }
  if (button) button.disabled = false;
}

async function confirmTag(id) {
  if (!selectedTagUser?.id) return toast('Select a BeatTag creator first.');
  if (selectedTagUser.id === currentUserId) return toast('You cannot tag yourself.');

  const c = state.challenges.find(x => x.id === id);
  if (!c) return;

  const button = $('#tagConfirmBtn');

  try {
    if (button) { button.disabled = true; button.textContent = 'Tagging…'; }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('Please log in first.');

    const { error } = await supabaseClient.from('challenge_tags').insert({
      challenge_id: id,
      tagged_by: user.id,
      tagged_user_id: selectedTagUser.id,
      tagged_name: selectedTagUser.name
    });

    if (error) {
      if (error.code === '23505') throw new Error('You already tagged this creator on this challenge.');
      throw error;
    }

    await loadTagsFromSupabase();
    const label = '@' + String(selectedTagUser.username || selectedTagUser.name || 'creator').replace(/^@/, '');
    closeModal();
    toast(`Tagged ${label} ✅`);
  } catch (err) {
    toast(err.message || 'Could not tag this creator.');
  } finally {
    if (button) { button.disabled = false; button.textContent = 'Tag Friend'; }
  }
}

/* =========================
   SHARE
========================= */

async function shareChallenge(id) {

  const c =
    state.challenges.find(
      x => x.id === id
    );

  if (!c) return;

  const url =
    location.href
      .split('#')[0] +
    '#challenge=' +
    id;

  const text =
    `🔥 BeatTag Challenge\n\n${c.title}\n\nCan you beat it?`;

  try {

    if (
      navigator.share
    ) {

      await navigator.share({
        title:
          'BeatTag Challenge',
        text,
        url
      });

    } else if (
      navigator.clipboard
    ) {

      await navigator
        .clipboard
        .writeText(
          text +
          '\n' +
          url
        );

      toast(
        'Challenge link copied 🔗'
      );

    } else {

      await copyLinkFallback('Share Challenge',url);
    }

  } catch (e) {

    console.log(
      'Share cancelled'
    );
  }
}


/* =========================
   CHAINS
========================= */
function renderChains() {

  const challenges = state.challenges || [];

  screenEl.innerHTML = `
    <div class="section-title">
      <h2>🔗 Challenge Chains</h2>
      <span class="muted">
        ${challenges.length}
      </span>
    </div>

    <div class="panel">
      <div
        class="chain-tree"
        id="tree">
      </div>
    </div>
  `;

  const tree = $('#tree');

  if (!challenges.length) {
    tree.innerHTML = `
      <div class="empty">
        No chains yet.
      </div>
    `;
    return;
  }

  // Root challenges have no parent challenge
  const roots = challenges.filter(
    c =>
      !c.parentId ||
      !challenges.some(
        x => x.id === c.parentId
      )
  );

  if (!roots.length) {
    tree.innerHTML = `
      <div class="empty">
        No connected chains found.
      </div>
    `;
    return;
  }

  tree.innerHTML = '';

  roots
    .slice()
    .sort(
      (a, b) =>
        a.createdAt - b.createdAt
    )
    .forEach(root => {

      const chainBox =
        document.createElement('div');

      chainBox.className =
        'chain-group';

      renderChainNode(
        root,
        chainBox,
        0
      );

      tree.appendChild(chainBox);
    });
}


function renderChainNode(
  challenge,
  container,
  level = 0
) {

  const children =
    state.challenges
      .filter(
        c =>
          c.parentId === challenge.id
      )
      .sort(
        (a, b) =>
          (a.createdAt || 0) -
          (b.createdAt || 0)
      );

  const node =
    document.createElement('div');

  node.className =
    'chain-node';

  node.style.marginLeft =
    `${Math.min(level, 6) * 18}px`;

  node.innerHTML = `
  <div class="chain-card">

    <div class="chain-card-top">

      <div class="avatar">${challenge.creatorAvatarUrl ? `<img src="${escapeAttr(challenge.creatorAvatarUrl)}" alt="">` : escapeHTML((challenge.creatorName||'?')[0].toUpperCase())}</div>

      <div class="chain-card-info">

        <div class="chain-gen-badge">
          Gen ${challenge.generation || 1}
        </div>

        <strong class="chain-title">
          ${escapeHTML(
            challenge.title ||
            'Untitled Challenge'
          )}
        </strong>

        <div class="chain-creator">
          by ${escapeHTML(
            challenge.creatorName ||
            'BeatTag User'
          )}
        </div>

      </div>

    </div>

    <div class="chain-stats">
      🔗 ${children.length}
      ${
        children.length === 1
          ? 'attempt'
          : 'attempts'
      }
    </div>

  </div>
`;

  container.appendChild(node);
if (children.length) {

  const branchWrap =
    document.createElement('div');

  branchWrap.className =
    children.length > 1
      ? 'chain-children branch'
      : 'chain-children';

  const toggle=document.createElement('button'); toggle.className='chain-toggle'; const initiallyCollapsed=level>=2; branchWrap.classList.toggle('hidden',initiallyCollapsed); toggle.textContent=initiallyCollapsed?`Show ${children.length} replies`:'Collapse replies'; toggle.onclick=()=>{const hidden=branchWrap.classList.toggle('hidden');toggle.textContent=hidden?`Show ${children.length} replies`:'Collapse replies';}; node.querySelector('.chain-card')?.appendChild(toggle);
  children.forEach(child => {

    const childWrap =
      document.createElement('div');

    childWrap.className =
      'chain-child';

    renderChainNode(
      child,
      childWrap,
      level + 1
    );

    branchWrap.appendChild(
      childWrap
    );
  });

  container.appendChild(
    branchWrap
  );
}

}

/* =========================
   PROFILE
========================= */

function normalizeExternalUrl(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';

  try {
    const candidate = /^https?:\/\//i.test(raw)
      ? raw
      : `https://${raw}`;
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.href;
  } catch (_) {
    return '';
  }
}

function countWords(value = '') {
  return String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length;
}

function profileLinksHTML(link1 = '', link2 = '') {
  const links = [link1, link2]
    .map(normalizeExternalUrl)
    .filter(Boolean);

  if (!links.length) return '';

  return `
    <div class="profile-links">
      ${links.map((url, i) => `
        <a
          href="${escapeAttr(url)}"
          target="_blank"
          rel="noopener noreferrer nofollow ugc"
          class="profile-link-button">
          🔗 ${i === 0 ? 'Website' : 'Link 2'}
        </a>
      `).join('')}
    </div>
  `;
}

function renderProfile() {

  const p = profile();

  const mine = state.challenges.filter(
    c => c.creator === currentUserId
  );

  const likes = mine.reduce(
    (s, c) => s + Object.keys(c.likes || {}).length,
    0
  );

  const attempts = mine.reduce(
    (s, c) => s + (c.attempts || 0),
    0
  );

  const maxGen = Math.max(
    1,
    ...mine.map(c => c.generation || 1)
  );

  const owned = SHOP.filter(
    item => isOwned(item.id)
  ).length;

  screenEl.innerHTML = `

    <section class="panel profile-head ${p.equippedTheme ? `profile-theme-${escapeAttr(p.equippedTheme)}` : ''}">

      <div class="profile-avatar ${p.equippedFrame ? `equipped-${escapeAttr(p.equippedFrame)}` : ''}">
        ${p.avatarUrl ? `<img src="${escapeAttr(p.avatarUrl)}" alt="${escapeAttr(p.name)} profile photo">` : (escapeHTML(p.name)[0] || 'B')}
      </div>

      <h2>${escapeHTML(p.name)}</h2>

      <div class="muted">
        ${escapeHTML(p.handle)}
      </div>

      ${p.bio ? `
        <p class="profile-bio">
          ${escapeHTML(p.bio)}
        </p>
      ` : ''}
      ${p.customStatus ? `<div class="bt-custom-status">💬 ${escapeHTML(p.customStatus)}</div>` : ''}

      ${profileLinksHTML(p.websiteUrl1, p.websiteUrl2)}

      ${p.equippedBadge ? `<div class="equipped-badge">${escapeHTML(shopItemById(p.equippedBadge)?.name || 'Badge')}</div>` : ''}
      ${p.equippedTheme ? `<div class="equipped-theme-label">Theme: ${escapeHTML(shopItemById(p.equippedTheme)?.name || 'Custom')}</div>` : ''}

      <div style="margin-top:9px">
        <span class="badge">🔥 ${p.streak} day streak</span>
        <span class="badge">🪙 ${p.coins} coins</span>
        <span class="badge">👥 ${followingIds.size} following</span>
        <span class="badge">🎁 ${owned} items</span>
      </div>

      <button class="profile-settings-icon" onclick="showSettingsModal()" aria-label="Settings" title="Settings">⚙</button>
      <div class="profile-primary-actions"><button class="secondary" onclick="editProfile()">Edit Profile</button><button class="secondary" onclick="openBeatTagFeatureCenter()">✨ Features</button><button class="primary" onclick="shareProfile('${escapeAttr(currentUserId||'')}','${escapeAttr(p.name||'BeatTag creator')}')">Share Profile</button></div>

    </section>

    <div class="grid">
      <div class="stat"><strong>${mine.length}</strong><span>Challenges</span></div>
      <div class="stat"><strong>${attempts}</strong><span>Attempts</span></div>
      <div class="stat"><strong>${likes}</strong><span>Likes received</span></div>
      <div class="stat"><strong>${maxGen}</strong><span>Longest generation</span></div>
    </div>

    ${isAdmin ? `
      <section class="panel" style="margin:16px 0;">
        <h3>🛡️ Admin Panel</h3>
        <button
          class="primary"
          style="width:100%; margin-top:10px;"
          onclick="renderAdminReports()">
          🚩 View Reports
        </button>
      </section>
    ` : ''}

    <div class="section-title">
      <h2>My Challenges</h2>
      <button class="ghost" onclick="go('shop')">🛍 Shop</button>
    </div>

    <div id="myFeed"></div>
  `;

  const f = $('#myFeed');

  if (!mine.length) {
    f.innerHTML = `
      <div class="empty">
        Create your first challenge.
      </div>
    `;
  } else {
    mine.forEach(c => f.appendChild(challengeCard(c)));
  }
}

async function renderPublicProfile(userId, fallbackName = 'BeatTag User') {
  if (!userId) return;

  if (userId === currentUserId) {
    go('profile');
    return;
  }

  currentTab = 'public-profile';
  stopStream();

  screenEl.innerHTML = `
    <div class="panel">
      <div class="empty">Loading profile...</div>
    </div>
  `;

  try {
    const [profileResult, followersResult, followingResult] = await Promise.all([
      supabaseClient.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabaseClient.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
      supabaseClient.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId)
    ]);

    if (profileResult.error) throw profileResult.error;

    const publicProfile = profileResult.data; recordProfileVisit(userId);
    const followerCount = followersResult.error ? 0 : (followersResult.count || 0);
    const followingCount = followingResult.error ? 0 : (followingResult.count || 0);

    const posts = state.challenges
      .filter(c => c.creator === userId)
      .sort((a, b) => b.createdAt - a.createdAt);

    const displayName = publicProfile?.name || publicProfile?.username || fallbackName || 'BeatTag User';
    const username = publicProfile?.username ? '@' + String(publicProfile.username).replace(/^@/, '') : '';
    const likes = posts.reduce((sum, c) => sum + Object.keys(c.likes || {}).length, 0);
    const attempts = posts.reduce((sum, c) => sum + (c.attempts || 0), 0);
    const maxGen = Math.max(1, ...posts.map(c => c.generation || 1));
    const joined = publicProfile?.created_at
      ? new Date(publicProfile.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
      : '';
    const followed = isFollowing(userId);

    screenEl.innerHTML = `
      <section class="panel public-profile-head premium-profile-head ${publicProfile?.equipped_theme ? `profile-theme-${escapeAttr(publicProfile.equipped_theme)}` : ''}">
        <button class="ghost public-profile-back" onclick="go('home')">← Back</button>

        <div class="profile-avatar public-avatar ${publicProfile?.equipped_frame ? `equipped-${escapeAttr(publicProfile.equipped_frame)}` : ''}">
          ${publicProfile?.avatar_url ? `<img src="${escapeAttr(publicProfile.avatar_url)}" alt="${escapeAttr(displayName)} profile photo">` : (escapeHTML(displayName)[0] || 'B')}
        </div>
        <h2>${escapeHTML(displayName)}</h2>
        ${username ? `<div class="muted">${escapeHTML(username)}</div>` : ''}

        <div class="public-social-stats">
          <button type="button" onclick="showFollowList('${escapeAttr(userId)}','followers')"><strong>${followerCount}</strong> Followers</button>
          <button type="button" onclick="showFollowList('${escapeAttr(userId)}','following')"><strong>${followingCount}</strong> Following</button>
        </div>

        ${publicProfile?.bio ? `<p class="profile-bio">${escapeHTML(publicProfile.bio)}</p>` : ''}${publicProfile?.custom_status ? `<div class="bt-custom-status">💬 ${escapeHTML(publicProfile.custom_status)}</div>` : ''}
        ${publicProfile?.equipped_badge ? `<div class="equipped-badge">${escapeHTML(shopItemById(publicProfile.equipped_badge)?.name || 'Badge')}</div>` : ''}
        ${publicProfile?.equipped_theme ? `<div class="equipped-theme-label">Theme: ${escapeHTML(shopItemById(publicProfile.equipped_theme)?.name || 'Custom')}</div>` : ''}
        ${profileLinksHTML(publicProfile?.website_url_1 || '', publicProfile?.website_url_2 || '')}
        ${joined ? `<div class="profile-joined">Joined ${escapeHTML(joined)}</div>` : ''}

        <div class="public-profile-actions">
          <button class="${followed ? 'secondary' : 'primary'} public-follow-btn" onclick="toggleFollow('${escapeAttr(userId)}')">
            ${followed ? '✓ Following' : '+ Follow'}
          </button>
          <button class="secondary" onclick="startDirectChat('${escapeAttr(userId)}')">💬 Message</button>
          <button class="secondary" onclick="shareProfile('${escapeAttr(userId)}','${escapeAttr(displayName)}')">Share Profile</button>
        </div>
      </section>

      <div class="grid public-profile-stats">
        <div class="stat"><strong>${posts.length}</strong><span>Challenges</span></div>
        <div class="stat"><strong>${likes}</strong><span>Likes received</span></div>
        <div class="stat"><strong>${attempts}</strong><span>Attempts</span></div>
        <div class="stat"><strong>${maxGen}</strong><span>Longest generation</span></div>
      </div>

      <div class="section-title"><h2>${escapeHTML(displayName)}'s Challenges</h2></div>
      <div id="publicProfileFeed"></div>
    `;

    const feed = $('#publicProfileFeed');
    if (!posts.length) {
      feed.innerHTML = `<div class="empty">No public challenges yet.</div>`;
    } else {
      posts.forEach(c => feed.appendChild(challengeCard(c)));
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    console.error('Public profile error:', err);
    screenEl.innerHTML = `
      <section class="panel">
        <button class="ghost" onclick="go('home')">← Back</button>
        <div class="empty" style="margin-top:14px;">Could not load this profile.</div>
      </section>
    `;
  }
}

async function shareProfile(userId, displayName = 'BeatTag creator') {
  const url = `${location.origin}${location.pathname}#profile=${encodeURIComponent(userId)}`;
  const text = `Check out ${displayName} on BeatTag.`;
  try {
    if (navigator.share) {
      await navigator.share({ title: `${displayName} on BeatTag`, text, url });
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      toast('Profile link copied ✅');
    } else {
      await copyLinkFallback('Share Profile',url);
    }
  } catch (err) {
    if (err?.name !== 'AbortError') toast('Could not share this profile.');
  }
}

async function showFollowList(userId, mode = 'followers') {
  const isFollowers = mode === 'followers';
  modal.classList.remove('hidden');
  modalCard.innerHTML = `
    <div class="modal-head"><h3>${isFollowers ? 'Followers' : 'Following'}</h3><button class="close" onclick="closeModal()">×</button></div>
    <div id="followListBox"><div class="empty">Loading…</div></div>
  `;
  const box = $('#followListBox');
  try {
    const column = isFollowers ? 'following_id' : 'follower_id';
    const other = isFollowers ? 'follower_id' : 'following_id';
    const { data: rows, error } = await supabaseClient.from('follows').select(`follower_id,following_id`).eq(column, userId).limit(100);
    if (error) throw error;
    const ids = [...new Set((rows || []).map(r => r[other]).filter(Boolean))];
    if (!ids.length) { box.innerHTML = `<div class="empty">No ${isFollowers ? 'followers' : 'following'} yet.</div>`; return; }
    const { data: profiles, error: profileError } = await supabaseClient.from('profiles').select('id,name,username,avatar_url').in('id', ids);
    if (profileError) throw profileError;
    const map = new Map((profiles || []).map(p => [p.id, p]));
    box.innerHTML = ids.map(id => {
      const p = map.get(id) || {};
      const name = p.name || p.username || 'BeatTag User';
      const handle = p.username ? '@' + String(p.username).replace(/^@/,'') : '';
      return `<button class="follow-list-row" onclick="closeModal();renderPublicProfile('${escapeAttr(id)}','${escapeAttr(name)}')">
        <span class="mini-avatar">${p.avatar_url ? `<img src="${escapeAttr(p.avatar_url)}" alt="">` : escapeHTML(name[0] || 'B')}</span>
        <span><strong>${escapeHTML(name)}</strong>${handle ? `<small>${escapeHTML(handle)}</small>` : ''}</span>
      </button>`;
    }).join('');
  } catch (err) {
    box.innerHTML = '<div class="empty">Could not load this list.</div>';
  }
}

async function renderAdminReports() {

  if (!isAdmin) {
    toast('Admin access required.');
    return;
  }

  screenEl.innerHTML = `
  <section style="
    background:linear-gradient(180deg,#15101d 0%,#0d0a12 100%);
    border:1px solid #3b2948;
    border-radius:24px;
    padding:18px;
    box-shadow:0 0 30px rgba(155,60,255,.10);
  ">

    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:18px;">
      <div>
        <h2 style="margin:0;font-size:24px;">🚩 Reported Challenges</h2>
        <p style="margin:6px 0 0;color:#aaa0b5;font-size:14px;">Review and manage reported content.</p>
      </div>

      <button
        onclick="renderProfile()"
        style="background:#17111f;color:#fff;border:1px solid #42304f;border-radius:14px;padding:10px 14px;font-weight:700;">
        ← Back
      </button>
    </div>

    <div id="adminReports">
      <div class="empty">Loading reports...</div>
    </div>
  </section>
`;

  const box = document.getElementById('adminReports');

  try {
    const { data, error } = await supabaseClient
      .from('reports')
      .select(`
        id,
        challenge_id,
        reported_by,
        reason,
        details,
        status,
        created_at,
        challenges (
          id,
          title,
          description,
          creator_id,
          status
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || !data.length) {
      box.innerHTML = `<div class="empty">✅ No pending reports</div>`;
      return;
    }

    box.innerHTML = data.map(report => {
      const challenge = report.challenges;
      const creatorId = challenge?.creator_id || '';

      return `
        <div class="admin-report-card">
          <div class="admin-report-top">
            <div class="admin-report-reason">🚩 ${escapeHTML(report.reason || 'Report')}</div>
            <div class="admin-report-time">${new Date(report.created_at).toLocaleString()}</div>
          </div>

          <h3>${escapeHTML(challenge?.title || 'Challenge unavailable')}</h3>

          ${challenge?.description ? `
            <div class="admin-report-description">${escapeHTML(challenge.description)}</div>
          ` : ''}

          ${report.details ? `
            <div class="admin-report-details">
              <small>REPORT DETAILS</small>
              <div>${escapeHTML(report.details)}</div>
            </div>
          ` : ''}

          <div class="admin-report-actions">
            <button class="admin-danger" onclick="adminRemoveChallenge('${report.id}','${report.challenge_id}')">🗑 Remove</button>
            <button class="admin-neutral" onclick="adminDismissReport('${report.id}')">✅ Dismiss</button>
          </div>

          ${creatorId ? `
            <div class="admin-user-actions">
              <button onclick="adminModerateUser('${creatorId}','warn')">⚠️ Warn User</button>
              <button onclick="adminModerateUser('${creatorId}','suspend')">⏸ Suspend 7 Days</button>
              <button class="admin-ban" onclick="adminModerateUser('${creatorId}','ban')">🚫 Ban User</button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Load admin reports error:', err);
    box.innerHTML = `<div class="empty">Could not load reports.</div>`;
  }
}

async function adminDismissReport(reportId) {
  if (!isAdmin) return;

  try {
    const { error } = await supabaseClient
      .from('reports')
      .update({ status: 'dismissed' })
      .eq('id', reportId);

    if (error) throw error;

    toast('Report dismissed ✅');
    await renderAdminReports();
  } catch (err) {
    console.error('Dismiss report error:', err);
    toast(err.message || 'Could not dismiss the report.');
  }
}

async function adminRemoveChallenge(reportId, challengeId) {
  if (!isAdmin) return;

  if (!(await beatConfirm('Remove Challenge','This challenge will be removed from BeatTag.','Remove',true))) return;

  try {
    const { error: challengeError } = await supabaseClient
      .from('challenges')
      .update({ status: 'removed' })
      .eq('id', challengeId);

    if (challengeError) throw challengeError;

    const { error: reportError } = await supabaseClient
      .from('reports')
      .update({ status: 'actioned' })
      .eq('id', reportId);

    if (reportError) throw reportError;

    await loadChallengesFromSupabase();
    toast('Challenge removed 🗑');
    await renderAdminReports();
  } catch (err) {
    console.error('Admin remove challenge error:', err);
    toast(err.message || 'Could not remove the challenge.');
  }
}

async function adminModerateUser(userId, action) {
  if (!isAdmin || !userId) return;

  const labels = {
    warn: 'Warn this user?',
    suspend: 'Suspend this user for 7 days?',
    ban: 'Ban this user and remove all active challenges?'
  };

  if (!(await beatConfirm('Moderation Action',labels[action] || 'Apply this moderation action?','Continue',action==='ban'))) return;

  const reason = await beatPrompt('Moderation Reason','Enter the reason for this action.','Community Guidelines violation',{confirmText:'Apply',multiline:true});

  if (reason === null) return;

  try {
    const { error } = await supabaseClient.rpc('admin_moderate_user', {
      target_user_id: userId,
      moderation_action: action,
      moderation_reason: reason.trim() || 'Community Guidelines violation'
    });

    if (error) throw error;

    toast(
      action === 'warn'
        ? 'User warned ⚠️'
        : action === 'suspend'
          ? 'User suspended ⏸'
          : 'User banned 🚫'
    );

    await loadChallengesFromSupabase();
    await renderAdminReports();
  } catch (err) {
    console.error('Admin moderation error:', err);
    toast(err.message || 'Moderation action failed. Run supabase_upgrade.sql first.');
  }
}

function editProfile() {
  const p = profile();

  modal.classList.remove('hidden');

  modalCard.innerHTML = `
    <div class="modal-head">
      <h3>Edit Profile</h3>
      <button class="close" onclick="closeModal()">×</button>
    </div>

    <div class="profile-edit-avatar">
      <div class="profile-avatar">
        ${p.avatarUrl ? `<img src="${escapeAttr(p.avatarUrl)}" alt="${escapeAttr(p.name)} profile photo">` : (escapeHTML(p.name)[0] || 'B')}
      </div>
      <label class="secondary avatar-upload-btn">
        Change Photo
        <input id="epAvatar" type="file" accept="image/jpeg,image/png,image/webp" hidden>
      </label>
      <small class="field-hint">JPG, PNG or WebP • max 5MB</small>
    </div>

    <div class="field">
      <label>Name <span id="epNameCount" class="field-hint"></span></label>
      <input id="epName" maxlength="60" value="${escapeAttr(p.name)}" oninput="updateProfileCounters()">
    </div>

    <div class="field">
      <label>Handle <span id="handleStatus" class="field-hint"></span></label>
      <input id="epHandle" maxlength="30" value="${escapeAttr(p.handle)}" oninput="onHandleInput()">
      <div class="field-hint">3–30 characters. Letters, numbers and underscore only.</div>
    </div>

    <div class="field">
      <label>Bio <span id="bioCharCount" class="field-hint"></span></label>
      <textarea id="epBio" maxlength="200" oninput="updateProfileCounters()" placeholder="Tell people about yourself...">${escapeHTML(p.bio || '')}</textarea>
      <div class="field-hint">Maximum 200 characters.</div>
    </div>

    <div class="field">
      <label>Link 1 <span class="field-hint">Portfolio / GitHub / Website</span></label>
      <input id="epWebsite1" inputmode="url" placeholder="https://example.com" value="${escapeAttr(p.websiteUrl1 || '')}">
    </div>

    <div class="field">
      <label>Link 2 <span class="field-hint">YouTube / Social / Website</span></label>
      <input id="epWebsite2" inputmode="url" placeholder="https://youtube.com/..." value="${escapeAttr(p.websiteUrl2 || '')}">
    </div>

    <div id="profileSaveMessage" class="inline-message"></div>
    <button id="profileSaveBtn" class="primary" style="width:100%" onclick="saveProfile()">Save Profile</button>
  `;

  const avatarInput = $('#epAvatar');
  if (avatarInput) {
    avatarInput.onchange = () => {
      const file = avatarInput.files?.[0];
      if (!file) return;
      if (!['image/jpeg','image/png','image/webp'].includes(file.type)) {
        toast('Choose a JPG, PNG or WebP image.');
        avatarInput.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast('Profile photo must be smaller than 5MB.');
        avatarInput.value = '';
        return;
      }
      const preview = modalCard.querySelector('.profile-edit-avatar .profile-avatar');
      if (preview) preview.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="Profile photo preview">`;
    };
  }

  updateProfileCounters();
  onHandleInput();
}

function updateProfileCounters() {
  const name = $('#epName');
  const bio = $('#epBio');
  const nameCount = $('#epNameCount');
  const bioCount = $('#bioCharCount');
  if (name && nameCount) nameCount.textContent = `${name.value.length}/60`;
  if (bio && bioCount) bioCount.textContent = `${bio.value.length}/200`;
}

let handleCheckTimer = null;
async function onHandleInput() {
  updateProfileCounters();
  const input = $('#epHandle');
  const status = $('#handleStatus');
  if (!input || !status) return;

  const raw = input.value.trim().replace(/^@/, '').toLowerCase();
  const clean = raw.replace(/[^a-z0-9_]/g, '');

  if (raw !== clean) {
    status.textContent = 'Invalid characters';
    status.className = 'field-hint field-error';
    return;
  }
  if (clean.length < 3) {
    status.textContent = 'At least 3 characters';
    status.className = 'field-hint';
    return;
  }

  clearTimeout(handleCheckTimer);
  status.textContent = 'Checking…';
  status.className = 'field-hint';

  handleCheckTimer = setTimeout(async () => {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('username', clean)
        .neq('id', currentUserId)
        .limit(1);

      if (error) throw error;

      status.textContent = data?.length ? 'Already taken' : 'Available ✓';
      status.className = data?.length ? 'field-hint field-error' : 'field-hint field-success';
    } catch (_) {
      status.textContent = '';
    }
  }, 350);
}

async function uploadProfileAvatar(file) {
  if (!file) return profile().avatarUrl || '';
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${currentUserId}/avatar-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabaseClient.storage
    .from('profile-media')
    .upload(path, file, { upsert: false, cacheControl: '3600', contentType: file.type });

  if (uploadError) throw uploadError;

  const { data } = supabaseClient.storage.from('profile-media').getPublicUrl(path);
  if (!data?.publicUrl) throw new Error('Could not create profile photo URL.');
  return data.publicUrl;
}

async function saveProfile() {
  const p = profile();

  const name = ($('#epName')?.value || '').trim();
  const rawHandle = ($('#epHandle')?.value || '').trim();
  const username = rawHandle.replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]/g, '');
  const bio = ($('#epBio')?.value || '').trim();
  const rawLink1 = ($('#epWebsite1')?.value || '').trim();
  const rawLink2 = ($('#epWebsite2')?.value || '').trim();
  const avatarFile = $('#epAvatar')?.files?.[0] || null;
  const button = $('#profileSaveBtn');
  const message = $('#profileSaveMessage');

  if (!name) return toast('Name is required.');
  if (name.length > 60) return toast('Name is too long.');
  if (username.length < 3 || username.length > 30) return toast('Handle must be 3–30 characters.');
  if (!/^[a-z0-9_]+$/.test(username)) return toast('Handle can only contain letters, numbers and underscore.');
  if (bio.length > 200) return toast('Bio can contain up to 200 characters.');

  const link1 = rawLink1 ? normalizeExternalUrl(rawLink1) : '';
  const link2 = rawLink2 ? normalizeExternalUrl(rawLink2) : '';
  if (rawLink1 && !link1) return toast('Link 1 must be a valid http/https URL.');
  if (rawLink2 && !link2) return toast('Link 2 must be a valid http/https URL.');

  try {
    if (button) {
      button.disabled = true;
      button.textContent = 'Saving…';
    }
    if (message) message.textContent = 'Saving profile…';

    const { data: duplicate, error: checkError } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('username', username)
      .neq('id', currentUserId)
      .limit(1);

    if (checkError) throw checkError;
    if (duplicate?.length) throw new Error('This handle is already taken.');

    const avatarUrl = avatarFile ? await uploadProfileAvatar(avatarFile) : (p.avatarUrl || '');

    const { error } = await supabaseClient
      .from('profiles')
      .update({
        name,
        username,
        bio,
        website_url_1: link1 || null,
        website_url_2: link2 || null,
        avatar_url: avatarUrl || null
      })
      .eq('id', currentUserId);

    if (error) throw error;

    p.name = name;
    p.handle = '@' + username;
    p.bio = bio;
    p.websiteUrl1 = link1;
    p.websiteUrl2 = link2;
    p.avatarUrl = avatarUrl;

    save();
    closeModal();
    renderProfile();
    toast('Profile updated ✅');
  } catch (err) {
    console.error('Profile save error:', err);
    if (message) message.textContent = err.message || 'Could not save profile.';
    toast(err.message || 'Could not save the profile.');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Save Profile';
    }
  }
}

function settingEnabled(key, fallback = true) {
  const value = localStorage.getItem(key);
  return value === null ? fallback : value === '1';
}

function settingsToggleRow(id, label, description, checked) {
  return `<label class="settings-toggle-row" for="${id}">
    <span><strong>${escapeHTML(label)}</strong><small>${escapeHTML(description)}</small></span>
    <input id="${id}" type="checkbox" ${checked ? 'checked' : ''} onchange="saveBeatTagSetting('${id}', this.checked)">
  </label>`;
}

function saveBeatTagSetting(key, enabled) {
  localStorage.setItem(key, enabled ? '1' : '0');
  toast('Setting saved');
}

function showSettingsModal() {
  const p = profile();
  const email = supabaseClient.auth.getUser ? '' : '';
  modal.classList.remove('hidden');
  modalCard.innerHTML = `
    <div class="modal-head settings-head">
      <div><h3>⚙️ Settings</h3><p class="muted">Manage your BeatTag account and app preferences.</p></div>
      <button class="close" onclick="closeModal()" aria-label="Close settings">×</button>
    </div>

    <section class="settings-section">
      <h4>Account</h4>
      <div class="settings-account-card">
        <div class="mini-avatar">${p.avatarUrl ? `<img src="${escapeAttr(p.avatarUrl)}" alt="">` : escapeHTML((p.name || 'B')[0])}</div>
        <div><strong>${escapeHTML(p.name || 'BeatTag User')}</strong><small>${escapeHTML(p.handle || '')}</small></div>
      </div>
      <button class="settings-row-btn" onclick="closeModal();editProfile()"><span>✏️ Edit Profile</span><b>›</b></button>
    </section>

    <section class="settings-section">
      <h4>Notifications</h4>
      ${settingsToggleRow('bt_notify_likes','Likes','Notify me when someone likes my challenge.',settingEnabled('bt_notify_likes'))}
      ${settingsToggleRow('bt_notify_comments','Comments','Notify me about new comments.',settingEnabled('bt_notify_comments'))}
      ${settingsToggleRow('bt_notify_follows','New Followers','Notify me when someone follows me.',settingEnabled('bt_notify_follows'))}
      ${settingsToggleRow('bt_notify_tags','Tags','Notify me when someone tags me.',settingEnabled('bt_notify_tags'))}
      ${settingsToggleRow('bt_notify_attempts','Challenge Attempts','Notify me when someone beats my challenge.',settingEnabled('bt_notify_attempts'))}
      <button class="settings-row-btn" onclick="requestBeatTagNotifications()"><span>🔔 Enable Device Notifications</span><b>›</b></button>
    </section>

    <section class="settings-section">
      <h4>Privacy & Safety</h4>
      ${settingsToggleRow('bt_privacy_profile','Public Profile','Allow people to view and share my public profile.',settingEnabled('bt_privacy_profile'))}
      ${settingsToggleRow('bt_safety_sensitive','Sensitive Content Warning','Show a warning before sensitive reported content.',settingEnabled('bt_safety_sensitive'))}
    </section>

    <section class="settings-section">
      <h4>BeatTag Features</h4>
      <button class="settings-row-btn" onclick="closeModal();openBeatTagFeatureCenter()"><span>✨ Feature Center</span><b>›</b></button>
      <button class="settings-row-btn" onclick="closeModal();setCustomStatus()"><span>💬 Custom Status</span><b>›</b></button>
      <button class="settings-row-btn" onclick="closeModal();openPrivacyControls()"><span>🔐 Privacy Controls</span><b>›</b></button>
      <button class="settings-row-btn" onclick="closeModal();openProfileVisitors()"><span>👀 Profile Visitors</span><b>›</b></button>
    </section>

    <section class="settings-section">
      <h4>App Preferences</h4>
      ${settingsToggleRow('bt_pref_sound','Notification Sound','Use sound for supported BeatTag notifications.',settingEnabled('bt_pref_sound'))}
      ${settingsToggleRow('bt_pref_vibration','Vibration','Use vibration when supported by this device.',settingEnabled('bt_pref_vibration'))}
      ${settingsToggleRow('bt_data_saver','Data Saver','Reduce automatic video loading and playback.',localStorage.getItem('bt_data_saver')==='1')}
      ${settingsToggleRow('bt_reduce_motion','Reduce Motion','Reduce non-essential animations.',localStorage.getItem('bt_reduce_motion')==='1')}
    </section>

    <section class="settings-section">
      <h4>Help & Support</h4>
      <a class="settings-row-link" href="about.html"><span>About BeatTag</span><b>›</b></a>
      <a class="settings-row-link" href="contact.html"><span>Contact</span><b>›</b></a>
      <a class="settings-row-link" href="community-guidelines.html"><span>Community Guidelines</span><b>›</b></a>
      <a class="settings-row-link" href="privacy.html"><span>Privacy Policy</span><b>›</b></a>
      <a class="settings-row-link" href="terms.html"><span>Terms & Conditions</span><b>›</b></a>
    </section>

    <section class="settings-section">
      <button class="settings-logout" onclick="logoutBeatTag()">🚪 Logout</button>
    </section>

    <section class="settings-section danger-zone">
      <h4>Danger Zone</h4>
      <p class="muted">Deleting your account deactivates your BeatTag profile and removes your active challenges.</p>
      <button class="danger-outline" onclick="requestAccountDeletion()">Delete Account</button>
    </section>`;
}

function beatTagConfirm({title='Are you sure?',message='',confirmText='Confirm',danger=false,requireText=''}={}){return new Promise(resolve=>{modal.classList.remove('hidden');modalCard.innerHTML=`<div class="modal-head"><h3>${escapeHTML(title)}</h3><button class="close" id="btConfirmClose">×</button></div><p class="muted">${escapeHTML(message)}</p>${requireText?`<div class="field"><label>Type ${escapeHTML(requireText)} to confirm</label><input id="btConfirmInput" autocomplete="off" placeholder="${escapeAttr(requireText)}"></div>`:''}<div class="confirm-actions"><button class="secondary" id="btConfirmCancel">Cancel</button><button class="${danger?'danger-outline':'primary'}" id="btConfirmOk">${escapeHTML(confirmText)}</button></div>`;let done=false;const finish=v=>{if(done)return;done=true;closeModal();resolve(v)};$('#btConfirmClose').onclick=()=>finish(false);$('#btConfirmCancel').onclick=()=>finish(false);$('#btConfirmOk').onclick=()=>{if(requireText&&($('#btConfirmInput')?.value||'').trim()!==requireText){toast(`Type ${requireText} to continue.`);return;}finish(true)};});}

async function requestAccountDeletion() {
  const approved=await beatTagConfirm({title:'Delete Account',message:'Your profile will be deactivated and your active challenges will be removed.',confirmText:'Delete Account',danger:true,requireText:'DELETE'}); if(!approved)return;

  try {
    const { error } = await supabaseClient.rpc('request_account_deletion');
    if (error) throw error;
    await supabaseClient.auth.signOut();
    showAuthScreen();
    const message = document.getElementById('authMessage');
    if (message) message.textContent = 'Your BeatTag account has been deactivated.';
  } catch (err) {
    console.error('Delete account error:', err);
    toast(err.message || 'Could not delete the account.');
  }
}

async function requestBeatTagNotifications() {
  try {
    // Android app: use the native runtime permission bridge first.
    if (window.BeatTagAndroid && typeof window.BeatTagAndroid.requestNotifications === 'function') {
      window.BeatTagAndroid.requestNotifications();
      localStorage.setItem('beattag_notifications_enabled','1');
      toast('Device notification permission requested 🔔');
      return;
    }

    if (!('Notification' in window)) {
      toast('Device notifications need the BeatTag Android app on this device.');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      localStorage.setItem('beattag_notifications_enabled','1');
      await showBeatTagNotification('BeatTag notifications enabled 🔔','Device notifications are enabled.');
      toast('Notifications enabled ✅');
    } else if (permission === 'denied') {
      localStorage.setItem('beattag_notifications_enabled','0');
      toast('Notifications are blocked. Enable them from the app/browser settings.');
    } else {
      toast('Notification permission was not granted.');
    }
  } catch (err) {
    console.error('Notification permission error:', err);
    toast('Could not enable notifications.');
  }
}

async function showBeatTagNotification(title, body, challengeId = '') {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (localStorage.getItem('beattag_notifications_enabled') !== '1') return;

  const options = {
    body,
    icon: './icon-512.png',
    badge: './icon-192.png',
    tag: challengeId ? `challenge-${challengeId}` : 'beattag-general',
    data: {
      url: challengeId
        ? `${location.origin}${location.pathname}#challenge=${encodeURIComponent(challengeId)}`
        : location.href
    }
  };

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, options);
    } else {
      new Notification(title, options);
    }
  } catch (err) {
    console.warn('Browser notification error:', err);
  }
}

/* =========================
   SHOP ITEMS
========================= */

const SHOP = [
  {id:'frame_neon',icon:'◇',name:'Neon Pulse Frame',desc:'A 30-day purple-pink profile frame.',cost:300,duration:'30 Days',category:'Frames',slot:'frame',featured:true,rarity:'Epic'},
  {id:'frame_cyber',icon:'⬡',name:'Cyber Edge Frame',desc:'A sharp neon frame for your creator profile.',cost:420,duration:'30 Days',category:'Frames',slot:'frame',rarity:'Legendary'},
  {id:'frame_inferno',icon:'🔥',name:'Inferno Frame',desc:'A fiery premium profile frame.',cost:1500,duration:'30 Days',category:'Frames',slot:'frame',featured:true,rarity:'Legendary'},
  {id:'frame_void',icon:'◈',name:'Void Crown Frame',desc:'A dark-purple Mythic creator frame.',cost:5000,duration:'30 Days',category:'Frames',slot:'frame',rarity:'Mythic'},
  {id:'badge_challenger',icon:'✦',name:'Challenger Badge',desc:'Show that you are here to compete.',cost:180,duration:'30 Days',category:'Badges',slot:'badge',featured:true,rarity:'Rare'},
  {id:'badge_chainmaster',icon:'∞',name:'Chain Master Badge',desc:'A premium badge for challenge-chain builders.',cost:360,duration:'30 Days',category:'Badges',slot:'badge',rarity:'Epic'},
  {id:'badge_streakmaster',icon:'⚡',name:'Streak Master Badge',desc:'A high-tier badge for consistent challengers.',cost:1200,duration:'30 Days',category:'Badges',slot:'badge',rarity:'Legendary'},
  {id:'badge_elite',icon:'♛',name:'Elite Creator Badge',desc:'A Mythic BeatTag creator badge.',cost:4500,duration:'30 Days',category:'Badges',slot:'badge',rarity:'Mythic'},
  {id:'theme_galaxy',icon:'✺',name:'Galaxy Theme',desc:'Adds a cosmic accent to your BeatTag profile.',cost:240,duration:'30 Days',category:'Themes',slot:'theme',featured:true,rarity:'Epic'},
  {id:'theme_midnight',icon:'◐',name:'Midnight Theme',desc:'A deeper profile style with subtle glow.',cost:200,duration:'30 Days',category:'Themes',slot:'theme',rarity:'Rare'},
  {id:'theme_aurora',icon:'✧',name:'Aurora Theme',desc:'Electric gradient accents with premium glow.',cost:1000,duration:'30 Days',category:'Themes',slot:'theme',rarity:'Legendary'},
  {id:'theme_void',icon:'●',name:'Void Theme',desc:'Deep black and violet Mythic profile styling.',cost:4000,duration:'30 Days',category:'Themes',slot:'theme',rarity:'Mythic'},
  {id:'boost_24h',icon:'↟',name:'Challenge Boost',desc:'Boost one active challenge for 24 hours.',cost:120,duration:'Consumable',category:'Boosts',consumable:true,featured:true,rarity:'Power-up'}
];

let currentShopCategory = 'All';
let shopSearchTerm = '';

function shopItemById(id){ return SHOP.find(item => item.id === id) || null; }
function inventoryEntry(id){ return shopInventory.get(id) || null; }
function inventoryQuantity(id){ return Number(inventoryEntry(id)?.quantity || 0); }
function isOwned(id){
  const item=shopItemById(id), inv=inventoryEntry(id);
  if(!item || !inv) return false;
  if(item.consumable) return Number(inv.quantity||0)>0;
  return !inv.expiresAt || inv.expiresAt>Date.now();
}

async function loadShopInventory(){
  shopInventory=new Map();
  if(!currentUserId) return;
  try{
    // Server-side cleanup removes expired cosmetics from equipped profile slots.
    // Older deployments may not have the RPC yet, so failure is intentionally non-fatal.
    try { await supabaseClient.rpc('cleanup_expired_shop_equipment'); } catch (_) {}

    const {data,error}=await supabaseClient.from('shop_inventory').select('item_id,quantity,expires_at').eq('user_id',currentUserId);
    if(error){ console.warn('Shop inventory unavailable:',error.message||error); return; }
    (data||[]).forEach(row=>shopInventory.set(row.item_id,{quantity:Number(row.quantity||0),expiresAt:row.expires_at?new Date(row.expires_at).getTime():0}));

    // Never render an expired cosmetic even if an older profile row still references it.
    const p=profile();
    if(p.equippedFrame && !isOwned(p.equippedFrame)) p.equippedFrame='';
    if(p.equippedBadge && !isOwned(p.equippedBadge)) p.equippedBadge='';
    if(p.equippedTheme && !isOwned(p.equippedTheme)) p.equippedTheme='';
    save();
  }catch(err){ console.warn('Shop inventory load error:',err); }
}

function getShopProgress(){
  const mine=state.challenges.filter(c=>c.creator===currentUserId);
  const likes=mine.reduce((sum,c)=>sum+Object.keys(c.likes||{}).length,0);
  const attempts=mine.reduce((sum,c)=>sum+Number(c.attempts||0),0);
  const score=Math.max(0,mine.length*20+likes*3+attempts*5+followingIds.size*2);
  return {mine,likes,attempts,score,level:Math.max(1,Math.floor(score/100)+1),levelProgress:score%100};
}
function equippedItemName(slot){
  const p=profile(); const id=slot==='frame'?p.equippedFrame:slot==='badge'?p.equippedBadge:p.equippedTheme;
  return shopItemById(id)?.name||'None';
}

function dailyRewardClaimedToday(){
  const stamp=Number(profile().dailyRewardClaimedAt||0);
  if(!stamp) return false;
  const d=new Date(stamp), now=new Date();
  return d.getUTCFullYear()===now.getUTCFullYear() && d.getUTCMonth()===now.getUTCMonth() && d.getUTCDate()===now.getUTCDate();
}

async function claimDailyReward(){
  if(!currentUserId) return toast('Please log in first.');
  const button=document.getElementById('dailyRewardBtn'); if(button) button.disabled=true;
  try{
    const {data,error}=await supabaseClient.rpc('claim_daily_shop_reward'); if(error) throw error;
    const result=Array.isArray(data)?data[0]:data;
    profile().coins=Number(result?.coins??profile().coins); save();
    const reward=Number(result?.reward??0);
    if(reward>0) profile().dailyRewardClaimedAt=Date.now();
    toast(reward>0?`Daily reward claimed: +${reward} coins 🪙`:'Daily reward already claimed today.');
    renderShop();
  }catch(err){
    console.error('Daily reward error:',err);
    toast(err?.message||'Could not claim the daily reward.');
    if(button) button.disabled=false;
  }
}

// =========================
// REWARDED ADS -> BEATCOINS
// Android bridge calls these callbacks only after the native rewarded-ad flow.
// The Supabase RPC is the source of truth for coin credit and daily limits.
// =========================

let rewardedAdBusy = false;
let rewardedAdRewardHandled = false;

function isBeatTagAndroidApp(){
  return !!(window.BeatTagAndroid && typeof window.BeatTagAndroid.showRewardedAd === 'function');
}

function setRewardedAdButtonState(disabled, label){
  const button=document.getElementById('rewardedAdBtn');
  if(!button) return;
  button.disabled=!!disabled;
  if(label) button.textContent=label;
}

async function watchRewardedAd(){
  if(!currentUserId) return toast('Please log in first.');
  if(rewardedAdBusy) return;

  if(!isBeatTagAndroidApp()){
    toast('Watch & Earn is available in the BeatTag Android app.');
    return;
  }

  rewardedAdBusy=true;
  rewardedAdRewardHandled=false;
  setRewardedAdButtonState(true,'Loading Ad…');

  try{
    window.BeatTagAndroid.showRewardedAd();
  }catch(err){
    console.error('Rewarded ad bridge error:',err);
    rewardedAdBusy=false;
    setRewardedAdButtonState(false,'▶ Watch & Earn +10');
    toast('Could not open the rewarded ad.');
  }
}

window.onBeatTagRewardEarned = async function(amount, type){
  // Ignore duplicate native callbacks for the same ad session.
  if(rewardedAdRewardHandled) return;
  rewardedAdRewardHandled=true;
  setRewardedAdButtonState(true,'Adding Coins…');

  try{
    const {data,error}=await supabaseClient.rpc('claim_rewarded_ad_coins');
    if(error) throw error;

    const result=Array.isArray(data)?data[0]:data;
    const success=result?.success===true;
    const coins=Number(result?.coins);
    const reward=Number(result?.reward||0);
    const claimsToday=Number(result?.claims_today||0);
    const dailyLimit=Number(result?.daily_limit||5);

    if(Number.isFinite(coins)) profile().coins=coins;
    save();

    if(success && reward>0){
      state.notifications.unshift({
        text:`Rewarded ad completed. +${reward} coins 🪙`,
        time:Date.now(),
        read:false
      });
      save();
      toast(`+${reward} BeatCoins added 🪙`);
    }else if(result?.reason==='daily_limit'){
      toast(`Daily ad reward limit reached (${dailyLimit}/${dailyLimit}).`);
    }else{
      toast('Reward could not be added.');
    }

    if(currentTab==='shop') renderShop();
    console.log('Rewarded ad reward:',{amount,type,success,reward,claimsToday,dailyLimit});
  }catch(err){
    console.error('Rewarded coin claim error:',err);
    toast(err?.message||'Could not add rewarded coins.');
  }finally{
    rewardedAdBusy=false;
    setRewardedAdButtonState(false,'▶ Watch & Earn +10');
  }
};

window.onBeatTagRewardedAdNotReady = function(){
  rewardedAdBusy=false;
  rewardedAdRewardHandled=false;
  setRewardedAdButtonState(false,'▶ Watch & Earn +10');
  toast('Ad is still loading. Try again in a moment.');
};

window.onBeatTagRewardedAdClosed = function(){
  // If Google did not fire OnUserEarnedRewardListener, no coins are granted.
  const earned=rewardedAdRewardHandled;
  rewardedAdBusy=false;
  setRewardedAdButtonState(false,'▶ Watch & Earn +10');
  if(!earned) toast('Ad closed before reward. No coins added.');
};

window.onBeatTagRewardedAdError = function(){
  rewardedAdBusy=false;
  rewardedAdRewardHandled=false;
  setRewardedAdButtonState(false,'▶ Watch & Earn +10');
  toast('Rewarded ad could not be shown. Try again later.');
};

async function buyItem(id){
  const item=shopItemById(id); if(!item||!currentUserId) return;
  const shortage=Math.max(0,Number(item.cost||0)-Number(profile().coins||0));
  if(shortage>0) return toast(`You need ${shortage} more BeatCoins.`);
  const button=document.querySelector(`[data-buy-item="${id}"]`); if(button) button.disabled=true;
  try{
    let {data,error}=await supabaseClient.rpc('purchase_shop_item_v14',{requested_item_id:id});
    if(error) throw error;
    const result=Array.isArray(data)?data[0]:data;
    if(result?.coins!==undefined) profile().coins=Number(result.coins);
    await loadShopInventory(); save(); toast(`${item.name} unlocked.`); renderShop();
  }catch(err){
    console.error('Shop purchase error:',err);
    toast(String(err?.message||'Purchase failed.'));
    if(button) button.disabled=false;
  }
}

async function equipShopItem(id){
  const item=shopItemById(id); if(!item?.slot||!isOwned(id)) return;
  try{
    const {error}=await supabaseClient.rpc('equip_shop_item_v14',{requested_item_id:id,requested_slot:item.slot}); if(error) throw error;
    if(item.slot==='frame') profile().equippedFrame=id;
    if(item.slot==='badge') profile().equippedBadge=id;
    if(item.slot==='theme') profile().equippedTheme=id;
    save(); toast(`${item.name} equipped.`); renderShop();
  }catch(err){ console.error('Equip item error:',err); toast(err?.message||'Could not equip this item.'); }
}

function openShopPreview(id){
  const item=shopItemById(id); if(!item) return;
  const p=profile();
  const frameClass=item.slot==='frame'?`equipped-${escapeAttr(item.id)}`:(p.equippedFrame?`equipped-${escapeAttr(p.equippedFrame)}`:'');
  const themeClass=item.slot==='theme'?`profile-theme-${escapeAttr(item.id)}`:(p.equippedTheme?`profile-theme-${escapeAttr(p.equippedTheme)}`:'');
  const badgeName=item.slot==='badge'?item.name:(shopItemById(p.equippedBadge)?.name||'');
  modal.classList.remove('hidden');
  modalCard.innerHTML=`
    <div class="modal-head"><div><h3 style="margin:0">${escapeHTML(item.name)}</h3><p class="muted" style="margin:6px 0 0">Preview before you unlock it.</p></div><button class="close" onclick="closeModal()">✕</button></div>
    <section class="shop-preview-card ${themeClass}">
      <div class="profile-avatar ${frameClass}">${escapeHTML(p.name||'B')[0]||'B'}</div>
      <h3>${escapeHTML(p.name||'BeatTag User')}</h3>
      <div class="muted">${escapeHTML(p.handle||'@beattag')}</div>
      ${badgeName?`<div class="equipped-badge">${escapeHTML(badgeName)}</div>`:''}
      <p>${escapeHTML(item.desc)}</p>
    </section>
    <button class="primary" style="width:100%;margin-top:12px" onclick="closeModal();go('shop')">Back to Shop</button>`;
}

function openBoostPicker(){
  if(inventoryQuantity('boost_24h')<1) return toast('Unlock a Challenge Boost first.');
  const mine=state.challenges.filter(c=>c.creator===currentUserId);
  modal.classList.remove('hidden');
  modalCard.innerHTML=`<div class="modal-head"><div><h3 style="margin:0">Boost a Challenge</h3><p class="muted" style="margin:6px 0 0">Your selected challenge gets a 24-hour feed boost.</p></div><button class="close" onclick="closeModal()">✕</button></div><div class="boost-picker-list">${mine.length?mine.map(c=>`<button class="boost-picker-item" onclick="useChallengeBoost('${escapeAttr(c.id)}')"><strong>${escapeHTML(c.title||'Untitled Challenge')}</strong><span>${(c.boostedUntil||0)>Date.now()?'Already boosted':'Boost for 24 hours'}</span></button>`).join(''):'<div class="empty">Create a challenge first.</div>'}</div>`;
}

async function useChallengeBoost(challengeId){
  try{
    const {data,error}=await supabaseClient.rpc('use_challenge_boost',{target_challenge_id:challengeId}); if(error) throw error;
    const result=Array.isArray(data)?data[0]:data; const challenge=state.challenges.find(c=>c.id===challengeId);
    if(challenge&&result?.boosted_until) challenge.boostedUntil=new Date(result.boosted_until).getTime();
    await loadShopInventory(); save(); closeModal(); toast('Challenge boosted for 24 hours.'); if(currentTab==='home') renderHome();
  }catch(err){ console.error('Challenge boost error:',err); toast(err?.message||'Could not boost this challenge.'); }
}

function shopExpiryText(id) {
  const inv = inventoryEntry(id);
  if (!inv?.expiresAt) return '';
  const diff = inv.expiresAt - Date.now();
  if (diff <= 0) return 'Expired';
  const days = Math.ceil(diff / 86400000);
  return `${days} day${days === 1 ? '' : 's'} left`;
}

function renderShopItem(container,item,compact=false){
  if(!container) return;

  const owned=isOwned(item.id);
  const quantity=inventoryQuantity(item.id);
  const p=profile();
  const equipped=item.slot==='frame'
    ? p.equippedFrame===item.id
    : item.slot==='badge'
      ? p.equippedBadge===item.id
      : item.slot==='theme'
        ? p.equippedTheme===item.id
        : false;

  const shortage=Math.max(0,Number(item.cost||0)-Number(p.coins||0));
  const buyLabel=shortage>0 ? `Need ${shortage} more` : `🪙 ${item.cost}`;

  const primaryAction=item.consumable
    ? (owned
        ? `<button class="secondary" onclick="openBoostPicker()">Use Boost (${quantity})</button>`
        : `<button class="primary" data-buy-item="${item.id}" ${shortage>0?'disabled':''} onclick="buyItem('${item.id}')">${buyLabel}</button>`)
    : (owned
        ? `<button class="${equipped?'secondary':'primary'}" ${equipped?'disabled':''} onclick="equipShopItem('${item.id}')">${equipped?'✓ Equipped':'Equip'}</button>`
        : `<button class="primary" data-buy-item="${item.id}" ${shortage>0?'disabled':''} onclick="buyItem('${item.id}')">${buyLabel}</button>`);

  const preview=item.slot?`<button class="ghost shop-preview-btn" onclick="openShopPreview('${item.id}')">Preview</button>`:'';
  const expiry=owned && !item.consumable ? shopExpiryText(item.id) : '';

  container.insertAdjacentHTML('beforeend',`
    <article class="shop-item ${compact?'featured-item':''}">
      <div class="shop-item-top">
        <div class="shop-icon">${item.icon}</div>
        <span class="shop-rarity">${escapeHTML(item.rarity||'')}</span>
      </div>
      <h3>${escapeHTML(item.name)}</h3>
      <p>${escapeHTML(item.desc)}</p>
      <div class="shop-meta">
        <span>${escapeHTML(item.category)}</span>
        <span>${escapeHTML(item.duration)}</span>
      </div>
      ${expiry ? `<div class="shop-expiry">${escapeHTML(expiry)}</div>` : ''}
      <div class="shop-card-actions">${preview}${primaryAction}</div>
    </article>`);
}

function getFilteredShopItems(){
  const q=shopSearchTerm.trim().toLowerCase();
  return SHOP.filter(item=>{
    const categoryMatch=currentShopCategory==='All' || (currentShopCategory==='Owned'?isOwned(item.id):item.category===currentShopCategory);
    const searchMatch=!q || `${item.name} ${item.desc} ${item.category} ${item.rarity}`.toLowerCase().includes(q);
    return categoryMatch && searchMatch;
  });
}

function setShopCategory(category){
  currentShopCategory=category;
  renderShopCatalog();
}
function setShopSearch(value){
  shopSearchTerm=String(value||'');
  renderShopCatalog();
}

function renderShopCollections(){
  const container=$('#shopCollections'); if(!container) return;
  const categories=['Frames','Badges','Themes','Boosts'];
  container.innerHTML=categories.map(category=>{
    const items=SHOP.filter(item=>item.category===category);
    const owned=items.filter(item=>isOwned(item.id)).length;
    return `<button class="collection-card" onclick="setShopCategory('${category}')"><span>${category==='Frames'?'◇':category==='Badges'?'✦':category==='Themes'?'✺':'↟'}</span><div><strong>${category}</strong><small>${owned}/${items.length} unlocked</small></div></button>`;
  }).join('');
}

function renderShopCatalog(){
  const items=getFilteredShopItems();
  const featuredItems=items.filter(item=>item.featured);
  const featuredSection=$('#featuredSection');
  const featured=$('#featuredShop');
  const store=$('#shop');
  const count=$('#shopItemCount');
  document.querySelectorAll('.shop-tabs button[data-category]').forEach(btn=>btn.classList.toggle('active',btn.dataset.category===currentShopCategory));
  if(featured){
    featured.innerHTML='';
    featuredItems.forEach(item=>renderShopItem(featured,item,true));
  }
  if(featuredSection) featuredSection.classList.toggle('hidden',featuredItems.length===0);
  if(store){
    store.innerHTML='';
    if(items.length){ items.forEach(item=>renderShopItem(store,item,false)); }
    else { store.innerHTML='<div class="empty shop-empty">No shop items match this filter.</div>'; }
  }
  if(count) count.textContent=`${items.length} item${items.length===1?'':'s'}`;
  renderInventoryItems();
}

function renderShop(){
  const progress=getShopProgress(), passTiers=[100,250,500,800], dailyClaimed=dailyRewardClaimedToday();
  const inventoryCount=[...shopInventory.values()].reduce((sum,item)=>sum+Math.max(0,Number(item.quantity||0)),0);
  screenEl.innerHTML=`
    <section class="shop-hero premium-shop-hero"><div class="shop-eyebrow">BEATTAG REWARDS</div><div class="shop-hero-row"><div><h2>Shop & Rewards</h2><p>Earn BeatCoins through challenges. Unlock cosmetics, boosts and profile upgrades.</p></div><div class="shop-balance"><span>BeatCoins</span><strong>🪙 ${profile().coins}</strong></div></div><div class="shop-level-wrap"><div class="shop-level-head"><strong>Level ${progress.level}</strong><span>${progress.levelProgress}/100 XP</span></div><div class="shop-level-track"><span style="width:${progress.levelProgress}%"></span></div></div></section>
    <section class="daily-reward-card"><div class="daily-reward-icon">✦</div><div><strong>Daily Reward</strong><p>Claim your daily BeatCoins and keep your challenge momentum going.</p></div><button id="dailyRewardBtn" class="primary" ${dailyClaimed ? 'disabled' : ''} onclick="claimDailyReward()">${dailyClaimed ? '✓ Claimed Today' : 'Claim +10'}</button></section>
    <section class="daily-reward-card rewarded-ad-card"><div class="daily-reward-icon">🪙</div><div><strong>Earn Free Coins</strong><p>Watch a rewarded ad and earn +10 BeatCoins. Up to 5 rewards per day.</p></div><button id="rewardedAdBtn" class="primary" onclick="watchRewardedAd()">▶ Watch & Earn +10</button></section>
    <div class="shop-search"><input type="search" value="${escapeAttr(shopSearchTerm)}" placeholder="Search rewards, frames, themes..." oninput="setShopSearch(this.value)" aria-label="Search BeatTag Shop"></div>
    <div class="shop-tabs" role="tablist">
      ${['All','Frames','Badges','Themes','Boosts','Owned'].map(category=>`<button data-category="${category}" class="${currentShopCategory===category?'active':''}" onclick="setShopCategory('${category}')">${category}</button>`).join('')}
    </div>
    <div class="section-title"><h2>Collections</h2><span class="muted">Build your style</span></div><div id="shopCollections" class="shop-collections"></div>
    <section id="featuredSection"><div class="section-title"><h2>Featured</h2><span class="muted">Curated for BeatTag</span></div><div class="shop-grid" id="featuredShop"></div></section>
    <section class="challenge-pass-card"><div class="challenge-pass-head"><div><span class="shop-eyebrow">CHALLENGE PASS</span><h3>Season Progress</h3></div><strong>${progress.score} XP</strong></div><div class="pass-track">${passTiers.map((tier,i)=>`<div class="pass-tier ${progress.score>=tier?'done':''}"><span>${i+1}</span><small>${tier} XP</small><em>${['+10 coins','Rare badge','+25 coins','Epic frame'][i]}</em></div>`).join('')}</div>${(()=>{const rewards=['+10 BeatCoins','Rare Badge','+25 BeatCoins','Epic Frame'];const i=passTiers.findIndex(t=>progress.score<t);return i>=0?`<div class="next-pass-reward"><strong>Next Reward: ${rewards[i]}</strong><span>${passTiers[i]-progress.score} XP to unlock • ${passTiers[i]} XP milestone</span></div>`:`<div class="next-pass-reward"><strong>Season milestones complete ✓</strong><span>All current rewards unlocked.</span></div>`})()}<p>Level ${progress.level} • ${progress.levelProgress}/100 XP • Next level in ${Math.max(0,100-progress.levelProgress)} XP.</p></section>
    <section class="shop-activity-card"><div><strong>${progress.mine.length}</strong><span>Challenges</span></div><div><strong>${progress.likes}</strong><span>Likes</span></div><div><strong>${progress.attempts}</strong><span>Attempts</span></div><div><strong>${followingIds.size}</strong><span>Following</span></div></section>
    <div class="section-title"><h2>Store</h2><span class="muted" id="shopItemCount">${SHOP.length} items</span></div><div class="shop-grid" id="shop"></div>
    <div class="section-title"><h2>My Inventory</h2><span class="muted">${inventoryCount} owned</span></div><section class="inventory-panel"><div class="inventory-summary"><span><strong>${equippedItemName('frame')}</strong><small>Frame</small></span><span><strong>${equippedItemName('badge')}</strong><small>Badge</small></span><span><strong>${equippedItemName('theme')}</strong><small>Theme</small></span></div><div id="inventoryItems" class="inventory-items"></div></section>`;
  renderShopCollections();
  renderShopCatalog();
}

function renderInventoryItems(){
  const container=$('#inventoryItems');
  if(!container) return;

  const ownedItems=SHOP.filter(item=>isOwned(item.id));
  if(!ownedItems.length){
    container.innerHTML='<div class="empty">Your unlocked items will appear here.</div>';
    return;
  }

  const p=profile();
  container.innerHTML=ownedItems.map(item=>{
    const equipped=item.slot==='frame'
      ? p.equippedFrame===item.id
      : item.slot==='badge'
        ? p.equippedBadge===item.id
        : item.slot==='theme'
          ? p.equippedTheme===item.id
          : false;

    const status=item.consumable
      ? `${inventoryQuantity(item.id)} available`
      : equipped
        ? 'Equipped'
        : (shopExpiryText(item.id) || 'Unlocked');

    return `<button class="inventory-chip ${equipped?'equipped':''}" onclick="${item.consumable?"openBoostPicker()":`openShopPreview('${item.id}')`}">
      <span>${item.icon}</span>
      <div><strong>${escapeHTML(item.name)}</strong><small>${escapeHTML(status)}</small></div>
    </button>`;
  }).join('');
}

/* =========================
   NOTIFICATIONS
========================= */

function notificationIcon(text = '') {
  const t = String(text).toLowerCase();
  if (t.includes('comment')) return '💬';
  if (t.includes('like')) return '❤️';
  if (t.includes('follow')) return '👥';
  if (t.includes('tag')) return '🏷️';
  if (t.includes('attempt')) return '🔥';
  if (t.includes('challenge')) return '⚡';
  if (t.includes('coin') || t.includes('reward')) return '🪙';
  return '🔔';
}

function cleanNotificationText(text = '') {
  let t = String(text);
  if (/tagged\..*\+2 coins/i.test(t)) return t.replace(/\s*\+2 coins.*$/i, '');
  if (/Attempt posted\.\s*\+25 coins/i.test(t)) return 'Attempt posted 🔥';
  return t;
}

function getNotificationKind(n={}){
  const t=String(n.kind||n.type||n.text||'').toLowerCase();
  if(t.includes('like')) return 'likes';
  if(t.includes('comment')) return 'comments';
  if(t.includes('tag')) return 'tags';
  if(t.includes('follow')) return 'follows';
  if(t.includes('message')||t.includes('chat')||t.includes('dm')) return 'messages';
  return 'other';
}
function setNotificationFilter(filter='all'){
  btSet('bt_notif_filter',filter);
  closeModal();
  openNotifications();
}
function openNotifications() {
  state.notifications = (state.notifications || []).map((n, i) => ({...n,_id:n._id||`${n.time||Date.now()}-${i}`}));
  const filter=btLocal('bt_notif_filter','all');
  const all=state.notifications;
  const visible=filter==='all'?all:all.filter(n=>getNotificationKind(n)===filter);
  const unread=all.filter(n=>!n.read).length;
  const labels={all:'All',likes:'Likes',comments:'Comments',tags:'Tags',follows:'Follows',messages:'Messages'};
  modal.classList.remove('hidden');
  modalCard.innerHTML=`
    <div class="modal-head notification-head"><div><h3>🔔 Notifications</h3><small class="muted">${unread} unread · ${escapeHTML(labels[filter]||'All')}</small></div><button class="close" onclick="closeModal()">×</button></div>
    <div class="notification-filter-pills">${Object.entries(labels).map(([k,v])=>`<button class="pill ${filter===k?'active':''}" onclick="setNotificationFilter('${k}')">${v}</button>`).join('')}</div>
    <div class="notification-toolbar"><button class="ghost" onclick="markAllNotificationsRead()">Mark all read</button><button class="ghost danger-text" onclick="clearAllNotifications()">Clear all</button></div>
    <div class="notification-list">${visible.length?visible.map(n=>`<div class="notification-item ${n.read?'':'unread'}"><button class="notification-main" onclick="openNotificationItem('${escapeAttr(n._id)}')"><span class="notification-type">${notificationIcon(n.text)}</span><span><strong>${escapeHTML(cleanNotificationText(n.text))}</strong><small>${fmt(n.time)}</small></span></button><button class="notification-delete" aria-label="Delete notification" onclick="deleteNotification('${escapeAttr(n._id)}')">×</button></div>`).join(''):`<div class="empty">No ${escapeHTML((labels[filter]||'notifications').toLowerCase())} notifications.</div>`}</div>`;
  save();
}
function openNotificationItem(id){const n=(state.notifications||[]).find(x=>x._id===id);if(!n)return;n.read=true;save();updateNotificationDot();closeModal();if(n.profileId){renderPublicProfile(n.profileId);return;}if(n.challengeId){openChallengeById(n.challengeId);}}
function notificationAllowed(kind){const map={like:'bt_notify_likes',comment:'bt_notify_comments',follow:'bt_notify_follows',tag:'bt_notify_tags',attempt:'bt_notify_attempts'};return settingEnabled(map[kind]||'',true);}
async function addActivityNotification(kind,text,challengeId='',profileId=''){if(!notificationAllowed(kind))return;state.notifications||=[];state.notifications.unshift({text,time:Date.now(),read:false,challengeId,profileId,_id:`${Date.now()}-${Math.random().toString(36).slice(2)}`});save();updateNotificationDot();await showBeatTagNotification('BeatTag',text,challengeId);}

function markNotificationRead(id) {
  const n = (state.notifications || []).find(x => x._id === id);
  if (n) n.read = true;
  save();
  updateNotificationDot();
  openNotifications();
}

function markAllNotificationsRead() {
  (state.notifications || []).forEach(n => n.read = true);
  save();
  updateNotificationDot();
  openNotifications();
}

function deleteNotification(id) {
  state.notifications = (state.notifications || []).filter(n => n._id !== id);
  save();
  updateNotificationDot();
  openNotifications();
}

async function clearAllNotifications(){
  if (!state.notifications?.length) return;
  if (!(await beatConfirm('Clear Notifications','Clear all notifications from this device?','Clear',true))) return;
  state.notifications = [];
  save();
  updateNotificationDot();
  openNotifications();
}

/* =========================
   SECURITY
========================= */

function escapeHTML(s = '') {

  return String(s)
    .replace(
      /[&<>"']/g,
      m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[m])
    );
}

function escapeAttr(s = '') {

  return escapeHTML(s);
}


/* =========================
   SHARED CHALLENGE LINK
========================= */

function checkSharedChallenge() {
  const profileMatch = location.hash.match(/profile=([^&]+)/);
  if (profileMatch) {
    const userId = decodeURIComponent(profileMatch[1]);
    if (userId) {
      setTimeout(() => renderPublicProfile(userId, 'BeatTag User'), 80);
      return;
    }
  }

  const m = location.hash.match(/challenge=([^&]+)/);
  if (!m) return;

  const id = decodeURIComponent(m[1]);
  const c = state.challenges.find(x => x.id === id);

  if (c) {
    renderHome();

    setTimeout(() => {
      const cards = [...document.querySelectorAll('.challenge-card')];
      const match = cards.find(card => card.querySelector('.challenge-title')?.textContent === c.title);
      match?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast('Challenge opened: ' + c.title);
    }, 150);
  }
}

window.addEventListener(
  'hashchange',
  checkSharedChallenge
);


/* =========================
   START APP
========================= */

updateCoins();
updateNotificationDot();

go('home');

checkSharedChallenge();
// ===============================
// BEATTAG SUPABASE REALTIME
// ===============================

const beatTagRealtime = supabaseClient
  .channel('beattag-live')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'challenges'
    },
    async (payload) => {
      const isNewChallenge = payload?.eventType === 'INSERT';
      const newId = payload?.new?.id;
      const creatorId = payload?.new?.creator_id;

      await loadChallengesFromSupabase();
      await Promise.all([
        loadReactionsFromSupabase(),
        loadCommentsFromSupabase(),
        loadTagsFromSupabase()
      ]);

      if(isNewChallenge&&newId&&creatorId!==currentUserId){const challenge=state.challenges.find(c=>c.id===newId);if(challenge){const parent=challenge.parentId?state.challenges.find(c=>c.id===challenge.parentId):null;if(parent?.creator===currentUserId){await addActivityNotification('attempt',`🔥 ${challenge.creatorName} beat your challenge: ${parent.title}`,challenge.id,creatorId);}else{state.notifications.unshift({text:`🔥 New challenge by ${challenge.creatorName}: ${challenge.title}`,time:Date.now(),read:false,challengeId:challenge.id});save();updateNotificationDot();}}}

      if (currentTab === 'home') {
        renderHome();
      }
    }
  )
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'reactions'
    },
    async (payload) => { const row=payload?.new||{}; if(payload?.eventType==='INSERT'&&row.user_id&&row.user_id!==currentUserId){const target=state.challenges.find(c=>c.id===row.challenge_id);if(target?.creator===currentUserId&&row.reaction_type==='like') await addActivityNotification('like',`❤️ Someone liked your challenge: ${target.title}`,target.id,row.user_id);} await loadReactionsFromSupabase(); if(currentTab==='home') renderHome(); }
  )
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'comments'
    },
    async (payload) => { const row=payload?.new||{}; if(payload?.eventType==='INSERT'&&row.user_id&&row.user_id!==currentUserId){const target=state.challenges.find(c=>c.id===row.challenge_id);if(target?.creator===currentUserId) await addActivityNotification('comment',`💬 New comment on: ${target.title}`,target.id,row.user_id);} await loadCommentsFromSupabase(); if(currentTab==='home') renderHome(); }
  )
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'challenge_tags'
    },
    async (payload) => { const row=payload?.new||{}; if(payload?.eventType==='INSERT'&&row.tagged_user_id===currentUserId&&row.tagged_by!==currentUserId){const target=state.challenges.find(c=>c.id===row.challenge_id);await addActivityNotification('tag',`🏷️ You were tagged${target?` in: ${target.title}`:' in a challenge'}`,row.challenge_id||'',row.tagged_by||'');} await loadTagsFromSupabase(); if(currentTab==='home') renderHome(); }
  )
  .on('postgres_changes',{event:'INSERT',schema:'public',table:'follows'},async(payload)=>{const row=payload?.new||{};if(row.following_id===currentUserId&&row.follower_id!==currentUserId)await addActivityNotification('follow','👥 You have a new follower','',row.follower_id||'');await loadFollowing();})
  .subscribe((status) => {
    console.log('BeatTag Realtime:', status);
  });


/* =========================================================
   BEATTAG SOCIAL UPGRADE — MESSAGES + MEDIA DOWNLOAD
========================================================= */
let activeConversationId = null;
let messageRealtimeChannel = null;
function setBeatTagBannerVisible(visible){try{if(window.BeatTagAndroid&&typeof window.BeatTagAndroid.setBannerVisible==='function')window.BeatTagAndroid.setBannerVisible(!!visible);}catch(_){}}
function setChatChrome(active){const nav=document.querySelector('.bottom-nav');if(nav)nav.classList.toggle('bt-chat-hidden',!!active);document.body.classList.toggle('bt-chat-open',!!active);setBeatTagBannerVisible(!active&&currentTab==='home');}


async function downloadChallengeMedia(id){
  const c=state.challenges.find(x=>x.id===id);
  const url=c?.media?.data;
  if(!url) return toast('No downloadable media on this challenge.');
  const extMap={image:'jpg',video:'mp4',audio:'mp3'};
  const fallbackExt=extMap[c.media.kind]||'bin';
  const safe=(c.title||'BeatTag').replace(/[^a-z0-9_-]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,60)||'BeatTag';
  try{
    toast('Preparing download...');
    const res=await fetch(url,{mode:'cors'});
    if(!res.ok) throw new Error('Download failed');
    const blob=await res.blob();
    const mimeExt=(blob.type.split('/')[1]||'').split(';')[0].replace('jpeg','jpg');
    const ext=(mimeExt && mimeExt.length<8 ? mimeExt : fallbackExt);
    const objectUrl=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=objectUrl; a.download=`${safe}.${ext}`; a.style.display='none';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(objectUrl),3000);
    toast('Download started ⬇');
  }catch(err){
    console.warn('Media download fallback:',err);
    const a=document.createElement('a'); a.href=url; a.target='_blank'; a.rel='noopener'; a.click();
    toast('Media opened. Use your browser download option.');
  }
}

async function startDirectChat(otherUserId){
  if(!currentUserId) return toast('Login required.');
  if(!otherUserId || otherUserId===currentUserId) return;
  try{
    const {data,error}=await supabaseClient.rpc('get_or_create_direct_conversation',{p_other_user:otherUserId});
    if(error) throw error;
    await openConversation(data);
  }catch(err){ console.error(err); toast(err.message||'Could not start chat.'); }
}

async function updateMessagesBadge(){
  const badge=document.getElementById('msgBadge');
  if(!badge||!currentUserId) return;
  try{
    const {data,error}=await supabaseClient.rpc('beattag_unread_message_count');
    if(error) throw error;
    const n=Number(data||0); badge.textContent=n>99?'99+':String(n); badge.classList.toggle('hidden',!n);
  }catch(_){ badge.classList.add('hidden'); }
}

async function renderMessagesInbox(){
  currentTab='messages'; stopStream(); activeConversationId=null; setChatChrome(false); setBeatTagBannerVisible(false);
  if(messageRealtimeChannel){ try{await supabaseClient.removeChannel(messageRealtimeChannel);}catch(_){} messageRealtimeChannel=null; }
  screenEl.innerHTML=`<section class="messages-shell"><div class="messages-title"><h2>Messages</h2><button class="ghost" onclick="renderNewMessagePicker()">＋ New</button></div><div class="message-search"><input id="messageSearch" placeholder="Search chats..." oninput="filterMessageRows(this.value)"></div><div id="messageInbox"><div class="empty">Loading chats...</div></div></section>`;
  try{
    const {data,error}=await supabaseClient.rpc('beattag_inbox'); if(error) throw error;
    const box=document.getElementById('messageInbox'); const rows=data||[];
    box.innerHTML=rows.length?'':`<div class="empty">No messages yet. Open a profile and tap Message.</div>`;
    rows.forEach(r=>{
      const el=document.createElement('button'); el.className='message-row'; el.dataset.search=`${r.display_name||''} ${r.username||''} ${r.last_message||''}`.toLowerCase();
      el.innerHTML=`<span class="message-avatar">${r.avatar_url?`<img src="${escapeAttr(r.avatar_url)}" alt="">`:escapeHTML((r.display_name||'?')[0].toUpperCase())}</span><span class="message-row-main"><strong>${escapeHTML(r.display_name||'BeatTag User')}</strong><small>${escapeHTML(r.last_message||'Start a conversation')}</small></span><span class="message-row-meta"><small>${r.last_message_at?fmt(new Date(r.last_message_at).getTime()):''}</small>${Number(r.unread_count)>0?`<b>${Number(r.unread_count)>99?'99+':Number(r.unread_count)}</b>`:''}</span>`;
      el.onclick=()=>openConversation(r.conversation_id); box.appendChild(el);
    });
    await updateMessagesBadge();
  }catch(err){console.error(err); document.getElementById('messageInbox').innerHTML=`<div class="empty">Could not load messages. Run the BeatTag upgrade SQL first.</div>`;}
}
function filterMessageRows(q){q=String(q||'').toLowerCase();document.querySelectorAll('.message-row').forEach(el=>el.classList.toggle('hidden',!el.dataset.search.includes(q)));}

async function renderNewMessagePicker(){
  screenEl.innerHTML=`<section class="messages-shell"><div class="messages-title"><button class="ghost" onclick="renderMessagesInbox()">←</button><h2>New message</h2></div><div class="message-search"><input id="peopleSearch" placeholder="Search people..." oninput="searchMessagePeople(this.value)"></div><div id="peopleResults" class="empty">Type a name or username.</div></section>`;
}
let peopleSearchToken=0;
async function searchMessagePeople(q){
  const box=document.getElementById('peopleResults'); q=String(q||'').trim(); const token=++peopleSearchToken;
  if(q.length<2){box.className='empty';box.textContent='Type at least 2 characters.';return;}
  const clean=q.replace(/^@/,'');
  const {data,error}=await supabaseClient.from('profiles').select('id,name,username,avatar_url').or(`name.ilike.%${clean}%,username.ilike.%${clean}%`).neq('id',currentUserId).limit(20);
  if(token!==peopleSearchToken)return; if(error){box.className='empty';box.textContent='Search failed.';return;}
  box.className='people-results';box.innerHTML='';(data||[]).forEach(p=>{const b=document.createElement('button');b.className='message-row';b.innerHTML=`<span class="message-avatar">${p.avatar_url?`<img src="${escapeAttr(p.avatar_url)}" alt="">`:escapeHTML((p.name||'?')[0])}</span><span class="message-row-main"><strong>${escapeHTML(p.name||'BeatTag User')}</strong><small>@${escapeHTML(p.username||'user')}</small></span>`;b.onclick=()=>startDirectChat(p.id);box.appendChild(b);});if(!data?.length){box.className='empty';box.textContent='No users found.';}
}

async function openConversation(conversationId){
  activeConversationId=conversationId; currentTab='messages'; stopStream(); setChatChrome(true);
  screenEl.innerHTML=`<section class="chat-shell"><div class="chat-head"><button class="chat-back-btn" onclick="renderMessagesInbox()" aria-label="Back">←</button><span id="chatHeaderAvatar" class="message-avatar chat-header-avatar">?</span><button id="chatPerson" class="chat-person-btn" type="button"><strong>Chat</strong><small>Loading…</small></button><button class="ghost" onclick="openChatMenu()">•••</button></div><div id="chatMessages" class="chat-messages"><div class="empty">Loading...</div></div><button id="newMessageJump" class="bt-new-message-jump hidden" onclick="scrollChatToBottom()">↓ New messages</button><div id="replyBar" class="reply-bar hidden"></div><div class="chat-compose"><button class="chat-attach" onclick="openChatAttachMenu()">＋</button><input id="chatFileInput" type="file" accept="image/*,video/*,audio/*" hidden onchange="sendChatAttachment(this.files[0]);this.value=''"><input id="chatViewOnceInput" type="file" accept="image/*,video/*" hidden onchange="sendViewOnceAttachment(this.files[0]);this.value=''"><textarea id="chatInput" rows="1" maxlength="4000" placeholder="Type a message..." oninput="saveChatDraft()"></textarea><button class="chat-send" onclick="sendChatMessage()">➤</button></div></section>`;
  await loadConversationMessages();
  if(messageRealtimeChannel){try{await supabaseClient.removeChannel(messageRealtimeChannel);}catch(_){}}
  messageRealtimeChannel=supabaseClient.channel(`bt-chat-${conversationId}`).on('postgres_changes',{event:'*',schema:'public',table:'messages',filter:`conversation_id=eq.${conversationId}`},()=>loadConversationMessages(false)).subscribe();
}

async function loadConversationMessages(scroll=true){
  if(!activeConversationId)return;
  try{
    const [{data:msgs,error},{data:parts}]=await Promise.all([
      supabaseClient.from('messages').select('id,conversation_id,sender_id,body,message_type,media_url,reply_to,edited_at,deleted_at,created_at').eq('conversation_id',activeConversationId).order('created_at',{ascending:true}).limit(300),
      supabaseClient.from('conversation_participants').select('user_id,profiles:user_id(name,username,avatar_url)').eq('conversation_id',activeConversationId)
    ]); if(error)throw error;
    const other=(parts||[]).find(x=>x.user_id!==currentUserId); const cp=document.getElementById('chatPerson'); const av=document.getElementById('chatHeaderAvatar'); if(cp&&other?.profiles){cp.innerHTML=`<strong>${escapeHTML(other.profiles.name||'BeatTag User')}</strong><small>@${escapeHTML(other.profiles.username||'user')}</small>`;cp.onclick=()=>renderPublicProfile(other.user_id,other.profiles.name||'BeatTag User');} if(av&&other?.profiles){av.innerHTML=other.profiles.avatar_url?`<img src="${escapeAttr(other.profiles.avatar_url)}" alt="">`:escapeHTML((other.profiles.name||'?')[0].toUpperCase()); av.onclick=()=>renderPublicProfile(other.user_id,other.profiles.name||'BeatTag User');} restoreChatDraft();
    const {data:hiddenRows}=await supabaseClient.from('message_hidden_for').select('message_id').eq('user_id',currentUserId); const hidden=new Set((hiddenRows||[]).map(x=>x.message_id));
    const box=document.getElementById('chatMessages'); if(!box)return; box.innerHTML='';
    (msgs||[]).filter(m=>!hidden.has(m.id)).forEach(m=>box.appendChild(renderMessageBubble(m,msgs||[])));
    if(!(msgs||[]).length)box.innerHTML='<div class="empty">Say hello 👋</div>';
    await supabaseClient.rpc('mark_conversation_read',{p_conversation:activeConversationId}); await updateMessagesBadge(); if(scroll)box.scrollTop=box.scrollHeight;
  }catch(err){console.error(err);const box=document.getElementById('chatMessages');if(box)box.innerHTML='<div class="empty">Could not load this chat.</div>';}
}
function renderMessageBubble(m,all){
  const mine=m.sender_id===currentUserId, wrap=document.createElement('div'); wrap.className=`message-bubble-wrap ${mine?'mine':'theirs'}`;
  const reply= m.reply_to ? all.find(x=>x.id===m.reply_to) : null;
  const media=m.media_url ? (m.message_type==='image'?`<img class="chat-media chat-image" src="${escapeAttr(m.media_url)}" alt="Chat photo" onclick="event.stopPropagation();openChatMediaViewer('image','${escapeAttr(m.media_url)}')">`:m.message_type==='video'?`<video class="chat-media chat-video" src="${escapeAttr(m.media_url)}" controls playsinline onclick="event.stopPropagation()"></video><button class="chat-fullscreen-btn" onclick="event.stopPropagation();openChatMediaViewer('video','${escapeAttr(m.media_url)}')">⛶ Full screen</button>`:`<audio class="chat-audio" src="${escapeAttr(m.media_url)}" controls onclick="event.stopPropagation()"></audio>`) : '';
  wrap.innerHTML=`<div class="message-bubble" onclick="openMessageOptions('${m.id}')">${reply?`<div class="message-reply-preview">${escapeHTML(reply.deleted_at?'Deleted message':reply.body||reply.message_type)}</div>`:''}${m.deleted_at?'<i>Message deleted</i>':`${media}${m.body?`<div>${escapeHTML(m.body)}</div>`:''}`}<small>${fmt(new Date(m.created_at).getTime())}${m.edited_at?' · edited':''}</small></div>`; return wrap;
}
let replyingToMessageId=null;
function setReplyMessage(id){replyingToMessageId=id;const bar=document.getElementById('replyBar');if(bar){bar.classList.remove('hidden');bar.innerHTML=`<span>Replying to message</span><button onclick="cancelMessageReply()">×</button>`;}closeModal();document.getElementById('chatInput')?.focus();}
function cancelMessageReply(){replyingToMessageId=null;document.getElementById('replyBar')?.classList.add('hidden');}
async function sendChatMessage(){const input=document.getElementById('chatInput');const body=input?.value.trim();if(!body||!activeConversationId||input?.dataset.sending==='1')return;input.dataset.sending='1';input.disabled=true;try{const {error}=await supabaseClient.from('messages').insert({conversation_id:activeConversationId,sender_id:currentUserId,body,message_type:'text',reply_to:replyingToMessageId});if(error)throw error;input.value='';saveChatDraft();cancelMessageReply();await loadConversationMessages();}catch(e){toast(e.message||'Message failed.');}finally{input.disabled=false;delete input.dataset.sending;input.value='';saveChatDraft();input.focus();}}
async function sendChatAttachment(file){if(!file||!activeConversationId)return;const type=(file.type||'').toLowerCase();const kind=type.startsWith('image/')?'image':type.startsWith('video/')?'video':type.startsWith('audio/')?'audio':'';if(!kind)return toast('Choose a photo, video or audio file.');if(file.size>50*1024*1024)return toast('File is too large. Maximum 50 MB.');try{toast('Uploading...');const ext=(file.name.split('.').pop()||kind).replace(/[^a-z0-9]/gi,'');const path=`${currentUserId}/${activeConversationId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;const {error:upErr}=await supabaseClient.storage.from('chat-media').upload(path,file,{contentType:file.type,upsert:false});if(upErr)throw upErr;const {data}=supabaseClient.storage.from('chat-media').getPublicUrl(path);const {error}=await supabaseClient.from('messages').insert({conversation_id:activeConversationId,sender_id:currentUserId,message_type:kind,media_url:data.publicUrl,reply_to:replyingToMessageId});if(error)throw error;cancelMessageReply();await loadConversationMessages();}catch(e){console.error(e);toast(e.message||'Upload failed.');}}
async function openMessageOptions(id){const {data:m}=await supabaseClient.from('messages').select('*').eq('id',id).maybeSingle();if(!m)return;const mine=m.sender_id===currentUserId;modal.classList.remove('hidden');modalCard.innerHTML=`<div class="modal-head"><h3>Message options</h3><button class="close" onclick="closeModal()">×</button></div><div class="bt-option-stack"><button class="secondary" onclick="setReplyMessage('${id}')">↩ Reply</button>${mine&&!m.deleted_at?`<button class="secondary" onclick="editChatMessage('${id}')">✏ Edit</button>`:''}<button class="secondary" onclick="deleteMessageForMe('${id}')">🗑 Delete for me</button>${mine&&!m.deleted_at?`<button class="danger" onclick="deleteMessageForEveryone('${id}')">🗑 Delete for everyone</button>`:''}</div>`;}
async function editChatMessage(id){const {data:m}=await supabaseClient.from('messages').select('body,sender_id').eq('id',id).maybeSingle();if(!m||m.sender_id!==currentUserId)return;const body=await beatPrompt('Edit message','Update your message.',m.body||'',{confirmText:'Save',multiline:true});if(body===null)return;const clean=body.trim();if(!clean)return toast('Message cannot be empty.');const {error}=await supabaseClient.from('messages').update({body:clean,edited_at:new Date().toISOString()}).eq('id',id).eq('sender_id',currentUserId);if(error)return toast(error.message);closeModal();loadConversationMessages(false);}
async function deleteMessageForMe(id){const {error}=await supabaseClient.from('message_hidden_for').upsert({message_id:id,user_id:currentUserId},{onConflict:'message_id,user_id'});if(error)return toast(error.message);closeModal();loadConversationMessages(false);}
async function deleteMessageForEveryone(id){if(!(await beatConfirm('Delete message','Delete this message for everyone?','Delete',true)))return;const {error}=await supabaseClient.from('messages').update({body:null,media_url:null,deleted_at:new Date().toISOString()}).eq('id',id).eq('sender_id',currentUserId);if(error)return toast(error.message);closeModal();loadConversationMessages(false);}
async function openChatMenu(){if(!activeConversationId)return;modal.classList.remove('hidden');modalCard.innerHTML=`<div class="modal-head"><h3>Chat options</h3><button class="close" onclick="closeModal()">×</button></div><div class="bt-option-stack"><button class="secondary" onclick="togglePinActiveChat()">📌 Pin / Unpin chat</button><button class="secondary" onclick="toggleMuteActiveChat()">🔕 Mute / Unmute</button><button class="secondary" onclick="toggleArchiveActiveChat()">🗄 Archive / Restore</button><button class="secondary" onclick="openChatSearch()">🔎 Search messages</button><button class="secondary" onclick="openStarredMessages()">⭐ Starred messages</button><button class="secondary" onclick="openChatMediaGallery()">🖼 Media gallery</button><button class="secondary" onclick="openChatPollCreator()">📊 Create poll</button><button class="secondary" onclick="openScheduleMessage()">🕒 Schedule message</button><button class="secondary" onclick="openSafetyCenter()">🛡 Safety Center</button><button class="secondary" onclick="blockChatUser()">🚫 Block user</button></div>`;}
async function blockChatUser(){const {data}=await supabaseClient.from('conversation_participants').select('user_id').eq('conversation_id',activeConversationId).neq('user_id',currentUserId).limit(1).maybeSingle();if(!data)return; if(!(await beatConfirm('Block user','They will no longer be able to start or continue a direct chat with you.','Block',true)))return;const {error}=await supabaseClient.from('user_blocks').insert({blocker_id:currentUserId,blocked_id:data.user_id});if(error&&error.code!=='23505')return toast(error.message);closeModal();renderMessagesInbox();toast('User blocked.');}


/* =========================
   BEATTAG SOCIAL PACK 2026-09
   Additive features; existing challenge/chat flows are preserved.
========================= */
function switchBeatTagCamera(){
  cameraFacingMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
  if(activeCameraKind) openCamera(activeCameraKind, cameraFacingMode);
}
function openChatMediaViewer(kind,url){
  if(!url)return;
  const overlay=document.createElement('div'); overlay.className='bt-media-viewer';
  overlay.innerHTML=`<button class="bt-media-close" aria-label="Close">×</button><div class="bt-media-stage">${kind==='video'?`<video src="${escapeAttr(url)}" controls autoplay playsinline></video>`:`<img src="${escapeAttr(url)}" alt="Full screen photo">`}</div>`;
  document.body.appendChild(overlay); overlay.querySelector('.bt-media-close').onclick=()=>overlay.remove();
  overlay.onclick=e=>{if(e.target===overlay)overlay.remove()};
}
const btLocal=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch(_){return fallback}};
const btSet=(key,val)=>localStorage.setItem(key,JSON.stringify(val));
function togglePinActiveChat(){if(!activeConversationId)return;const a=btLocal('bt_pinned_chats',[]);const i=a.indexOf(activeConversationId);if(i>=0)a.splice(i,1);else a.unshift(activeConversationId);btSet('bt_pinned_chats',a);closeModal();toast(i>=0?'Chat unpinned.':'Chat pinned.');}
async function openChatMediaGallery(){if(!activeConversationId)return;const {data,error}=await supabaseClient.from('messages').select('id,message_type,media_url,created_at').eq('conversation_id',activeConversationId).not('media_url','is',null).order('created_at',{ascending:false});if(error)return toast(error.message);modal.classList.remove('hidden');modalCard.innerHTML=`<div class="modal-head"><h3>Media gallery</h3><button class="close" onclick="closeModal()">×</button></div><div class="bt-media-grid">${(data||[]).map(m=>m.message_type==='image'?`<img src="${escapeAttr(m.media_url)}" onclick="openChatMediaViewer('image','${escapeAttr(m.media_url)}')">`:m.message_type==='video'?`<button onclick="openChatMediaViewer('video','${escapeAttr(m.media_url)}')">▶ Video</button>`:`<audio src="${escapeAttr(m.media_url)}" controls></audio>`).join('')||'<div class="empty">No shared media yet.</div>'}</div>`;}
async function openScheduleMessage(){const body=await beatPrompt('Schedule message','Type the message to send later.','',{confirmText:'Next',multiline:true});if(!body?.trim())return;const when=await beatPrompt('Send time','Enter local date/time like 2026-09-21 18:30.','',{confirmText:'Schedule'});if(!when)return;const d=new Date(when.replace(' ','T'));if(!Number.isFinite(d.getTime())||d<=new Date())return toast('Choose a future date/time.');const {error}=await supabaseClient.from('scheduled_messages').insert({conversation_id:activeConversationId,sender_id:currentUserId,body:body.trim(),send_at:d.toISOString()});if(error)return toast(error.message);closeModal();toast('Message scheduled.');}
async function openChatPollCreator(){const q=await beatPrompt('Create poll','Poll question','',{confirmText:'Next'});if(!q?.trim())return;const opts=await beatPrompt('Poll options','Enter 2–6 options, one per line.','',{confirmText:'Create',multiline:true});const arr=(opts||'').split(/\n/).map(x=>x.trim()).filter(Boolean).slice(0,6);if(arr.length<2)return toast('Add at least 2 options.');const {data,error}=await supabaseClient.from('chat_polls').insert({conversation_id:activeConversationId,created_by:currentUserId,question:q.trim()}).select('id').single();if(error)return toast(error.message);const {error:e2}=await supabaseClient.from('chat_poll_options').insert(arr.map((text,i)=>({poll_id:data.id,option_text:text,sort_order:i})));if(e2)return toast(e2.message);closeModal();toast('Poll created.');}
async function sendViewOnceAttachment(file){if(!file||!activeConversationId)return;const type=(file.type||'').split(';')[0].toLowerCase();const kind=type.startsWith('image/')?'image':type.startsWith('video/')?'video':'';if(!kind)return toast('View Once supports photo or video.');if(file.size>50*1024*1024)return toast('File is too large.');try{const ext=(file.name.split('.').pop()||kind).replace(/[^a-z0-9]/gi,'');const path=`${currentUserId}/${activeConversationId}/${Date.now()}-once.${ext}`;const {error:upErr}=await supabaseClient.storage.from('chat-media').upload(path,file,{contentType:file.type,upsert:false});if(upErr)throw upErr;const {data}=supabaseClient.storage.from('chat-media').getPublicUrl(path);const {error}=await supabaseClient.from('messages').insert({conversation_id:activeConversationId,sender_id:currentUserId,message_type:kind,media_url:data.publicUrl,reply_to:replyingToMessageId,is_view_once:true});if(error)throw error;toast('View Once media sent.');loadConversationMessages();}catch(e){toast(e.message||'Upload failed.')}}
function saveOfflineBeatTagDraft(kind,payload){const a=btLocal('bt_offline_drafts',[]);a.unshift({id:crypto.randomUUID?.()||String(Date.now()),kind,payload,createdAt:Date.now()});btSet('bt_offline_drafts',a.slice(0,50));toast('Draft saved on this device.');}
function getBeatTagDrafts(){return btLocal('bt_offline_drafts',[])}
async function setCustomStatus(){const v=await beatPrompt('Custom status','Set a short status.','',{confirmText:'Save'});if(v===null)return;const {error}=await supabaseClient.from('profiles').update({custom_status:v.trim().slice(0,80)}).eq('id',currentUserId);if(error)return toast(error.message);profile().customStatus=v.trim().slice(0,80);save();toast('Status updated.');}
async function setDmPrivacy(mode){const {error}=await supabaseClient.from('profiles').update({dm_privacy:mode}).eq('id',currentUserId);if(error)return toast(error.message);toast('Message privacy updated.');}
async function setCommentPrivacy(mode){const {error}=await supabaseClient.from('profiles').update({comment_privacy:mode}).eq('id',currentUserId);if(error)return toast(error.message);toast('Comment privacy updated.');}
async function recordProfileVisit(profileId){if(!profileId||profileId===currentUserId)return;try{await supabaseClient.rpc('record_profile_visit',{p_profile:profileId});}catch(_){}}
async function createEventRoom(title,expiresAt){const {data,error}=await supabaseClient.from('event_rooms').insert({title,created_by:currentUserId,expires_at:expiresAt}).select().single();if(error)throw error;return data;}
async function createCollaborativeAlbum(title){const {data,error}=await supabaseClient.from('collaborative_albums').insert({title,created_by:currentUserId}).select().single();if(error)throw error;return data;}
async function saveSharedChallengeDraft(title,description,collaboratorId){const {error}=await supabaseClient.from('shared_challenge_drafts').insert({owner_id:currentUserId,collaborator_id:collaboratorId,title,description});if(error)throw error;toast('Shared draft saved.');}
async function createChallengeCountdown(challengeId,startsAt){const {error}=await supabaseClient.from('challenge_countdowns').upsert({challenge_id:challengeId,starts_at:startsAt,created_by:currentUserId},{onConflict:'challenge_id'});if(error)throw error;}
async function getMemoryRecap(){const since=new Date(Date.now()-365*86400000).toISOString();return supabaseClient.from('challenges').select('id,title,challenge_type,media_url,created_at').eq('creator_id',currentUserId).gte('created_at',since).order('created_at',{ascending:true}).limit(50);}
function openSafetyCenter(){modal.classList.remove('hidden');modalCard.innerHTML=`<div class="modal-head"><h3>Safety Center</h3><button class="close" onclick="closeModal()">×</button></div><div class="bt-option-stack"><button class="secondary" onclick="go('profile');closeModal()">Privacy settings</button><button class="secondary" onclick="toast('Use the ••• menu on a user or challenge to report/block.')">Report & block help</button><a class="secondary" href="privacy.html">Privacy Policy</a><a class="secondary" href="community-guidelines.html">Community Guidelines</a></div>`;}
window.addEventListener('online',()=>{const n=getBeatTagDrafts().length;if(n)toast(`${n} offline draft${n===1?'':'s'} ready to review.`)});


/* =========================================================
   BEATTAG FINAL FEATURE PACK v17
   UI + device-safe enhancements layered on existing flows.
========================================================= */
function btBackButton(label='Back'){return `<button class="bt-back" onclick="historyBackBeatTag()">← ${escapeHTML(label)}</button>`}
function historyBackBeatTag(){ if(currentTab==='messages'&&activeConversationId){renderMessagesInbox();return;} if(currentTab==='public-profile'){go('home');return;} go('profile'); }
function scrollChatToBottom(){const b=$('#chatMessages');if(b)b.scrollTop=b.scrollHeight;$('#newMessageJump')?.classList.add('hidden')}
function saveChatDraft(){if(!activeConversationId)return;const v=$('#chatInput')?.value||'';const all=btLocal('bt_chat_drafts',{});if(v.trim())all[activeConversationId]=v;else delete all[activeConversationId];btSet('bt_chat_drafts',all)}
function restoreChatDraft(){if(!activeConversationId)return;const v=btLocal('bt_chat_drafts',{})[activeConversationId]||'';const el=$('#chatInput');if(el&&!el.value)el.value=v}
function openChatAttachMenu(){modal.classList.remove('hidden');modalCard.innerHTML=`<div class="modal-head"><h3>Send</h3><button class="close" onclick="closeModal()">×</button></div><div class="bt-option-stack"><button class="secondary" onclick="closeModal();$('#chatFileInput').click()">📎 Photo / Video / Audio</button><button class="secondary" onclick="closeModal();$('#chatViewOnceInput').click()">👁 View Once photo/video</button><button class="secondary" onclick="closeModal();openChatPollCreator()">📊 Poll</button><button class="secondary" onclick="closeModal();openScheduleMessage()">🕒 Scheduled message</button></div>`}
function toggleMuteActiveChat(){const a=btLocal('bt_muted_chats',[]),i=a.indexOf(activeConversationId);if(i>=0)a.splice(i,1);else a.push(activeConversationId);btSet('bt_muted_chats',a);closeModal();toast(i>=0?'Chat unmuted.':'Chat muted.')}
function toggleArchiveActiveChat(){const a=btLocal('bt_archived_chats',[]),i=a.indexOf(activeConversationId);if(i>=0)a.splice(i,1);else a.push(activeConversationId);btSet('bt_archived_chats',a);closeModal();toast(i>=0?'Chat restored.':'Chat archived.')}
function starMessageLocal(id){const a=btLocal('bt_starred_messages',[]),i=a.indexOf(id);if(i>=0)a.splice(i,1);else a.unshift(id);btSet('bt_starred_messages',a);toast(i>=0?'Star removed.':'Message starred ⭐')}
async function openStarredMessages(){const ids=btLocal('bt_starred_messages',[]);modal.classList.remove('hidden');if(!ids.length){modalCard.innerHTML=`<div class="modal-head"><h3>Starred messages</h3><button class="close" onclick="closeModal()">×</button></div><div class="empty">No starred messages yet.</div>`;return}const {data}=await supabaseClient.from('messages').select('id,body,created_at').in('id',ids).order('created_at',{ascending:false});modalCard.innerHTML=`<div class="modal-head"><h3>Starred messages</h3><button class="close" onclick="closeModal()">×</button></div>${(data||[]).map(x=>`<div class="bt-list-card"><strong>${escapeHTML(x.body||'Media message')}</strong><small>${new Date(x.created_at).toLocaleString()}</small></div>`).join('')||'<div class="empty">No available starred messages.</div>'}`}
async function openChatSearch(){const q=await beatPrompt('Search messages','Type words to find in this conversation.','',{confirmText:'Search'});if(!q?.trim())return;const {data,error}=await supabaseClient.from('messages').select('id,body,created_at').eq('conversation_id',activeConversationId).ilike('body',`%${q.trim()}%`).order('created_at',{ascending:false}).limit(50);if(error)return toast(error.message);modal.classList.remove('hidden');modalCard.innerHTML=`<div class="modal-head"><h3>Search results</h3><button class="close" onclick="closeModal()">×</button></div>${(data||[]).map(x=>`<div class="bt-list-card"><strong>${escapeHTML(x.body||'')}</strong><small>${new Date(x.created_at).toLocaleString()}</small></div>`).join('')||'<div class="empty">No matching messages.</div>'}`}
function openBeatTagFeatureCenter(){currentTab='feature-center';screenEl.innerHTML=`<section class="bt-feature-page">${btBackButton('Profile')}<div class="section-title"><h2>✨ BeatTag Feature Center</h2></div><p class="muted">Social, chat, privacy and creator tools in one place.</p><div class="bt-feature-grid">${[
['💬','Custom Status','setCustomStatus()'],['👀','Profile Visitors','openProfileVisitors()'],['🔐','Privacy Controls','openPrivacyControls()'],['📝','Challenge Drafts','openChallengeDrafts()'],['🤝','Shared Draft','createSharedDraftUI()'],['⏳','Challenge Countdown','createCountdownUI()'],['🔥','Comeback Streak','openComebackStreak()'],['👥','Friend Activity','openFriendActivity()'],['🎪','Event Rooms','openEventRooms()'],['🖼','Collaborative Albums','openCollaborativeAlbums()'],['🕰','Memory Recap','openMemoryRecap()'],['🛡','Safety Center','openSafetyCenter()'],['📴','Offline Drafts','openOfflineDrafts()'],['🔔','Notification Filters','openNotificationFilters()'],['📶','Data Saver','openDataPreferences()'],['🔎','Recent Searches','openRecentSearches()'],['🔗','Share & Deep Links','openShareTools()'],['♿','Accessibility','openAccessibilitySettings()'],['📋','Report Center','openReportCenter()']
].map(x=>`<button class="bt-feature-card" onclick="${x[2]}"><span>${x[0]}</span><strong>${x[1]}</strong><small>Open ›</small></button>`).join('')}</div></section>`;window.scrollTo(0,0)}
async function openPrivacyControls(){const {data}=await supabaseClient.from('profiles').select('dm_privacy,comment_privacy,profile_visits_enabled').eq('id',currentUserId).maybeSingle();modal.classList.remove('hidden');modalCard.innerHTML=`<div class="modal-head"><h3>Privacy Controls</h3><button class="close" onclick="closeModal()">×</button></div><div class="field"><label>Who can message me</label><select id="btDmPrivacy"><option value="everyone">Everyone</option><option value="following">Following</option><option value="nobody">Nobody</option></select></div><div class="field"><label>Who can comment</label><select id="btCommentPrivacy"><option value="everyone">Everyone</option><option value="following">Following</option><option value="nobody">Nobody</option></select></div><label class="bt-check"><input id="btVisitorsEnabled" type="checkbox"> Show profile visitors when enabled</label><button class="primary" style="width:100%;margin-top:14px" onclick="savePrivacyControls()">Save</button>`;$('#btDmPrivacy').value=data?.dm_privacy||'everyone';$('#btCommentPrivacy').value=data?.comment_privacy||'everyone';$('#btVisitorsEnabled').checked=!!data?.profile_visits_enabled}
async function savePrivacyControls(){const dm=$('#btDmPrivacy').value,comment=$('#btCommentPrivacy').value,vis=$('#btVisitorsEnabled').checked;const {error}=await supabaseClient.from('profiles').update({dm_privacy:dm,comment_privacy:comment,profile_visits_enabled:vis}).eq('id',currentUserId);if(error)return toast(error.message);closeModal();toast('Privacy settings saved.')}
async function openProfileVisitors(){const {data:p}=await supabaseClient.from('profiles').select('profile_visits_enabled').eq('id',currentUserId).maybeSingle();if(!p?.profile_visits_enabled)return toast('Enable Profile Visitors in Privacy Controls first.');const {data,error}=await supabaseClient.from('profile_visits').select('visitor_id,visited_at').eq('profile_id',currentUserId).order('visited_at',{ascending:false}).limit(50);if(error)return toast(error.message);const ids=[...new Set((data||[]).map(x=>x.visitor_id))];let map=new Map();if(ids.length){const {data:ps}=await supabaseClient.from('profiles').select('id,name,username,avatar_url,profile_visits_enabled').in('id',ids);map=new Map((ps||[]).filter(x=>x.profile_visits_enabled).map(x=>[x.id,x]));}modal.classList.remove('hidden');modalCard.innerHTML=`<div class="modal-head"><h3>Profile Visitors</h3><button class="close" onclick="closeModal()">×</button></div>${(data||[]).filter(x=>map.has(x.visitor_id)).map(x=>{const p=map.get(x.visitor_id);return `<button class="message-row" onclick="closeModal();renderPublicProfile('${escapeAttr(p.id)}','${escapeAttr(p.name||'User')}')"><span class="message-avatar">${p.avatar_url?`<img src="${escapeAttr(p.avatar_url)}">`:escapeHTML((p.name||'?')[0])}</span><span class="message-row-main"><strong>${escapeHTML(p.name||'BeatTag User')}</strong><small>@${escapeHTML(p.username||'user')}</small></span></button>`}).join('')||'<div class="empty">No visible visitors yet.</div>'}`}
function openChallengeDrafts(){const a=btLocal('bt_challenge_drafts',[]);modal.classList.remove('hidden');modalCard.innerHTML=`<div class="modal-head"><h3>Challenge Drafts</h3><button class="close" onclick="closeModal()">×</button></div><button class="primary" style="width:100%;margin-bottom:12px" onclick="createLocalChallengeDraft()">＋ New Draft</button>${a.map(d=>`<div class="bt-list-card"><strong>${escapeHTML(d.title||'Untitled')}</strong><small>${new Date(d.createdAt).toLocaleString()}</small><button class="ghost" onclick="deleteLocalDraft('${d.id}')">Delete</button></div>`).join('')||'<div class="empty">No saved drafts.</div>'}`}
async function createLocalChallengeDraft(){const title=await beatPrompt('Challenge Draft','Challenge title','',{confirmText:'Next'});if(!title)return;const desc=await beatPrompt('Description','Add details','',{confirmText:'Save',multiline:true});const a=btLocal('bt_challenge_drafts',[]);a.unshift({id:String(Date.now()),title:title.trim(),description:(desc||'').trim(),createdAt:Date.now()});btSet('bt_challenge_drafts',a);openChallengeDrafts();toast('Draft saved.')}
function deleteLocalDraft(id){btSet('bt_challenge_drafts',btLocal('bt_challenge_drafts',[]).filter(x=>x.id!==id));openChallengeDrafts()}
async function createSharedDraftUI(){const title=await beatPrompt('Shared Challenge Draft','Challenge title','',{confirmText:'Next'});if(!title)return;const desc=await beatPrompt('Description','Draft details','',{confirmText:'Next',multiline:true});const user=await beatPrompt('Collaborator','Enter exact username without @','',{confirmText:'Save'});if(!user)return;const {data:p}=await supabaseClient.from('profiles').select('id').eq('username',user.replace(/^@/,'')).maybeSingle();if(!p)return toast('User not found.');try{await saveSharedChallengeDraft(title.trim(),(desc||'').trim(),p.id)}catch(e){toast(e.message)}}
async function createCountdownUI(){const mine=state.challenges.filter(c=>c.creator===currentUserId);if(!mine.length)return toast('Create a challenge first.');modal.classList.remove('hidden');modalCard.innerHTML=`<div class="modal-head"><h3>Challenge Countdown</h3><button class="close" onclick="closeModal()">×</button></div><div class="field"><label>Challenge</label><select id="btCountdownChallenge">${mine.map(c=>`<option value="${escapeAttr(c.id)}">${escapeHTML(c.title)}</option>`).join('')}</select></div><div class="field"><label>Start date & time</label><input id="btCountdownAt" type="datetime-local"></div><button class="primary" style="width:100%" onclick="saveCountdownUI()">Save Countdown</button>`}
async function saveCountdownUI(){const id=$('#btCountdownChallenge').value,d=new Date($('#btCountdownAt').value);if(!id||!Number.isFinite(d.getTime())||d<=new Date())return toast('Choose a future time.');try{await createChallengeCountdown(id,d.toISOString());closeModal();toast('Countdown saved.')}catch(e){toast(e.message)}}
async function openComebackStreak(){const last=Number(localStorage.getItem('bt_comeback_at')||0);if(Date.now()-last<30*86400000)return toast('Comeback recovery can be used once every 30 days.');if((profile().streak||0)>0)return toast('Your streak is active. Recovery is not needed.');const ok=await beatConfirm('Comeback Streak','Recover a broken streak once this month?','Recover');if(!ok)return;const {error}=await supabaseClient.from('streak_recoveries').insert({user_id:currentUserId,streak_value:1});if(error)return toast(error.message);localStorage.setItem('bt_comeback_at',String(Date.now()));profile().streak=1;save();toast('Comeback streak activated 🔥');renderProfile()}
async function openFriendActivity(){const {data,error}=await supabaseClient.from('user_activity').select('user_id,activity_type,challenge_id,created_at').order('created_at',{ascending:false}).limit(50);if(error)return toast(error.message);modal.classList.remove('hidden');modalCard.innerHTML=`<div class="modal-head"><h3>Friend Activity</h3><button class="close" onclick="closeModal()">×</button></div>${(data||[]).map(x=>`<div class="bt-list-card"><strong>${escapeHTML(x.activity_type.replaceAll('_',' '))}</strong><small>${new Date(x.created_at).toLocaleString()}</small></div>`).join('')||'<div class="empty">No recent friend activity.</div>'}`}
async function openEventRooms(){const {data,error}=await supabaseClient.from('event_rooms').select('*').gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false});if(error)return toast(error.message);modal.classList.remove('hidden');modalCard.innerHTML=`<div class="modal-head"><h3>Event Rooms</h3><button class="close" onclick="closeModal()">×</button></div><button class="primary" style="width:100%;margin-bottom:12px" onclick="createEventRoomUI()">＋ Create Room</button>${(data||[]).map(r=>`<div class="bt-list-card"><strong>${escapeHTML(r.title)}</strong><small>Ends ${new Date(r.expires_at).toLocaleString()}</small></div>`).join('')||'<div class="empty">No active rooms.</div>'}`}
async function createEventRoomUI(){const title=await beatPrompt('Event Room','Room title','',{confirmText:'Next'});if(!title)return;const hours=await beatPrompt('Room duration','How many hours?','24',{confirmText:'Create'});const n=Math.max(1,Math.min(168,Number(hours)||24));try{await createEventRoom(title.trim(),new Date(Date.now()+n*3600000).toISOString());openEventRooms();toast('Event room created.')}catch(e){toast(e.message)}}
async function openCollaborativeAlbums(){const {data,error}=await supabaseClient.from('collaborative_albums').select('*').order('created_at',{ascending:false}).limit(50);if(error)return toast(error.message);modal.classList.remove('hidden');modalCard.innerHTML=`<div class="modal-head"><h3>Collaborative Albums</h3><button class="close" onclick="closeModal()">×</button></div><button class="primary" style="width:100%;margin-bottom:12px" onclick="createAlbumUI()">＋ Create Album</button>${(data||[]).map(a=>`<div class="bt-list-card"><strong>${escapeHTML(a.title)}</strong><small>${new Date(a.created_at).toLocaleDateString()}</small></div>`).join('')||'<div class="empty">No albums yet.</div>'}`}
async function createAlbumUI(){const title=await beatPrompt('New Album','Album title','',{confirmText:'Create'});if(!title)return;try{await createCollaborativeAlbum(title.trim());openCollaborativeAlbums();toast('Album created.')}catch(e){toast(e.message)}}
async function openMemoryRecap(){const {data,error}=await getMemoryRecap();if(error)return toast(error.message);modal.classList.remove('hidden');modalCard.innerHTML=`<div class="modal-head"><h3>Memory Recap</h3><button class="close" onclick="closeModal()">×</button></div>${(data||[]).slice(-12).reverse().map(c=>`<div class="bt-list-card"><strong>${escapeHTML(c.title||'Challenge')}</strong><small>${new Date(c.created_at).toLocaleDateString()}</small></div>`).join('')||'<div class="empty">No memories yet.</div>'}`}
function openOfflineDrafts(){const a=getBeatTagDrafts();modal.classList.remove('hidden');modalCard.innerHTML=`<div class="modal-head"><h3>Offline Drafts</h3><button class="close" onclick="closeModal()">×</button></div>${a.map(d=>`<div class="bt-list-card"><strong>${escapeHTML(d.kind||'Draft')}</strong><small>${new Date(d.createdAt).toLocaleString()}</small></div>`).join('')||'<div class="empty">No offline drafts.</div>'}`}
function openNotificationFilters(){const current=btLocal('bt_notif_filter','all');modal.classList.remove('hidden');modalCard.innerHTML=`<div class="modal-head"><h3>Notification Filters</h3><button class="close" onclick="closeModal()">×</button></div><p class="muted">Choose which notifications to show.</p>${['All','Likes','Comments','Tags','Follows','Messages'].map(x=>{const k=x.toLowerCase();return `<button class="secondary ${current===k?'bt-selected-filter':''}" style="width:100%;margin:5px 0" onclick="setNotificationFilter('${k}')">${current===k?'✓ ':''}${x}</button>`}).join('')}`}
function openDataPreferences(){modal.classList.remove('hidden');modalCard.innerHTML=`<div class="modal-head"><h3>Data & Playback</h3><button class="close" onclick="closeModal()">×</button></div><label class="bt-check"><input type="checkbox" ${localStorage.getItem('bt_data_saver')==='1'?'checked':''} onchange="localStorage.setItem('bt_data_saver',this.checked?'1':'0');applyBeatTagPreferences()"> Data Saver</label><label class="bt-check"><input type="checkbox" ${localStorage.getItem('bt_autoplay')==='0'?'':'checked'} onchange="localStorage.setItem('bt_autoplay',this.checked?'1':'0');applyBeatTagPreferences()"> Video autoplay</label>`}
function openAccessibilitySettings(){modal.classList.remove('hidden');modalCard.innerHTML=`<div class="modal-head"><h3>Accessibility</h3><button class="close" onclick="closeModal()">×</button></div><label class="bt-check"><input type="checkbox" ${localStorage.getItem('bt_reduce_motion')==='1'?'checked':''} onchange="localStorage.setItem('bt_reduce_motion',this.checked?'1':'0');applyBeatTagPreferences()"> Reduce motion</label><label class="bt-check"><input type="checkbox" ${localStorage.getItem('bt_large_text')==='1'?'checked':''} onchange="localStorage.setItem('bt_large_text',this.checked?'1':'0');applyBeatTagPreferences()"> Larger text</label>`}
function applyBeatTagPreferences(){document.documentElement.classList.toggle('bt-reduce-motion',localStorage.getItem('bt_reduce_motion')==='1');document.documentElement.classList.toggle('bt-large-text',localStorage.getItem('bt_large_text')==='1');document.querySelectorAll('video').forEach(v=>{v.autoplay=localStorage.getItem('bt_autoplay')!=='0'&&localStorage.getItem('bt_data_saver')!=='1';v.preload=localStorage.getItem('bt_data_saver')==='1'?'metadata':'auto'})}
function openRecentSearches(){const a=btLocal('bt_recent_searches',[]);modal.classList.remove('hidden');modalCard.innerHTML=`<div class="modal-head"><h3>Recent Searches</h3><button class="close" onclick="closeModal()">×</button></div>${a.map(x=>`<div class="bt-list-card"><strong>${escapeHTML(x)}</strong></div>`).join('')||'<div class="empty">No recent searches saved.</div>'}<button class="secondary" style="width:100%;margin-top:12px" onclick="btSet('bt_recent_searches',[]);openRecentSearches()">Clear history</button>`}
function openShareTools(){modal.classList.remove('hidden');modalCard.innerHTML=`<div class="modal-head"><h3>Share & Deep Links</h3><button class="close" onclick="closeModal()">×</button></div><button class="primary" style="width:100%" onclick="shareProfile('${escapeAttr(currentUserId||'')}','${escapeAttr(profile().name||'BeatTag creator')}')">Share My Profile</button><p class="muted" style="margin-top:12px">Shared BeatTag profile links open the matching public profile when supported.</p>`}
async function openReportCenter(){const {data,error}=await supabaseClient.from('reports').select('*').eq('reporter_id',currentUserId).order('created_at',{ascending:false}).limit(50);modal.classList.remove('hidden');if(error){modalCard.innerHTML=`<div class="modal-head"><h3>Report Center</h3><button class="close" onclick="closeModal()">×</button></div><div class="empty">Report history is not available for this account.</div>`;return}modalCard.innerHTML=`<div class="modal-head"><h3>Report Center</h3><button class="close" onclick="closeModal()">×</button></div>${(data||[]).map(r=>`<div class="bt-list-card"><strong>${escapeHTML(r.reason||'Report')}</strong><small>${escapeHTML(r.status||'Submitted')}</small></div>`).join('')||'<div class="empty">No reports submitted.</div>'}`}
function showBeatTagNetworkState(){let el=document.getElementById('btNetworkBanner');if(!el){el=document.createElement('div');el.id='btNetworkBanner';el.className='bt-network-banner';document.body.appendChild(el)}el.textContent=navigator.onLine?'Back online':'Waiting for connection…';el.classList.toggle('hidden',navigator.onLine);}
window.addEventListener('online',showBeatTagNetworkState);window.addEventListener('offline',showBeatTagNetworkState);window.addEventListener('DOMContentLoaded',()=>{showBeatTagNetworkState();applyBeatTagPreferences()});
window.addEventListener('beforeunload',e=>{const dirty=($('#chatInput')?.value||'').trim()||($('#title')?.value||'').trim()||($('#desc')?.value||'').trim();if(dirty){e.preventDefault();e.returnValue='';}});


/* =========================
   BEATTAG MUSIC v18.1
   Creator/authorized catalog + persistent in-app player
========================= */
let btMusicTracks = [];
let btMusicCurrent = null;
let btMusicAudio = null;
let btMusicSearchTimer = null;

function btMusicEnsurePlayer(){
  if (btMusicAudio) return btMusicAudio;
  btMusicAudio = new Audio();
  btMusicAudio.preload = 'metadata';
  btMusicAudio.addEventListener('timeupdate', btMusicUpdateMini);
  btMusicAudio.addEventListener('play', btMusicUpdateMini);
  btMusicAudio.addEventListener('pause', btMusicUpdateMini);
  btMusicAudio.addEventListener('ended', btMusicNext);
  return btMusicAudio;
}
function btMusicField(t,...names){for(const n of names){if(t && t[n]!==undefined && t[n]!==null)return t[n]}return ''}
function btMusicTitle(t){return btMusicField(t,'title','name')||'Untitled track'}
function btMusicArtist(t){return btMusicField(t,'artist_name','stage_name','artist')||t.music_artists?.stage_name||t.music_artists?.name||'BeatTag Artist'}
function btMusicAudioUrl(t){return btMusicField(t,'audio_url','file_url','stream_url','url')}
function btMusicCover(t){return btMusicField(t,'cover_url','artwork_url','image_url')||'icon-512.png'}

async function btMusicLoad(query=''){
  try{
    let q=supabaseClient.from('music_tracks').select('*,music_artists(*)').order('created_at',{ascending:false}).limit(100);
    if(query) q=q.ilike('title',`%${query.replace(/[%_,]/g,'')}%`);
    const {data,error}=await q;
    if(error) throw error;
    btMusicTracks=(data||[]).filter(t=>btMusicAudioUrl(t));
    return btMusicTracks;
  }catch(err){
    console.error('Music load error:',err);
    btMusicTracks=[];
    return [];
  }
}
async function renderMusic(query=''){
  screenEl.innerHTML=`<div class="music-shell">
    <section class="music-hero"><h1>♫ BeatTag Music</h1><p>Listen, discover and let independent artists be heard.</p>
      <div class="music-actions"><button class="primary" onclick="openMusicUpload()">＋ Upload Your Music</button><button class="secondary" onclick="renderMusic()">↻ Refresh</button></div>
    </section>
    <div class="music-search"><input id="btMusicSearch" value="${escapeAttr(query)}" placeholder="Search songs…" autocomplete="off"><button class="secondary" onclick="btMusicSearchNow()">Search</button></div>
    <section class="music-section"><h2>${query?'Search Results':'Fresh Uploads'}</h2><div id="btMusicList"><div class="music-empty">Loading music…</div></div></section>
    <section class="music-section"><h2>Rising Artists</h2><div class="music-empty">Artists grow here as listeners discover their authorized uploads.</div></section>
  </div>`;
  $('#btMusicSearch')?.addEventListener('input',e=>{clearTimeout(btMusicSearchTimer);btMusicSearchTimer=setTimeout(()=>btMusicSearchNow(),350)});
  await btMusicLoad(query);
  btMusicRenderList();
  btMusicMountMini();
}
async function btMusicSearchNow() {
  const query = ($('#btMusicSearch')?.value || '').trim();

  if (!query) {
    await renderMusic();
    return;
  }

  const list = $('#btMusicList');
  if (list) {
    list.innerHTML = '<div class="music-empty">Searching BeatTag + YouTube…</div>';
  }

  await btMusicLoad(query);
  btMusicRenderList();

  try {
    const { data, error } = await supabaseClient.functions.invoke('bright-action', {
      body: { query }
    });

    if (error) {
      console.error('YouTube Edge Function error:', error);
      toast('YouTube search unavailable.');
      return;
    }

    if (data?.error) {
      console.error('YouTube API error:', data.error);
      toast('YouTube search unavailable.');
      return;
    }

    const youtubeTracks = (data?.items || [])
      .filter(item => item?.videoId)
      .map(item => ({
        source: 'youtube',
        videoId: item.videoId,
        title: item.title || 'YouTube Music',
        artist: item.channelTitle || 'YouTube',
        cover: item.thumbnail || ''
      }));

    btMusicRenderYouTube(youtubeTracks);
  } catch (err) {
    console.error('YouTube search failed:', err);
    toast('Could not search YouTube.');
  }
}

function btMusicRenderYouTube(tracks) {
  const list = $('#btMusicList');

  if (!list || !tracks.length) return;

  const heading = document.createElement('div');
  heading.className = 'music-source-heading';
  heading.innerHTML = '<strong>YouTube Music</strong>';

  list.appendChild(heading);

  tracks.forEach(track => {
    const row = document.createElement('div');
    row.className = 'music-track';

    row.innerHTML = `
      <img
        class="music-cover"
        src="${escapeAttr(track.cover)}"
        alt=""
      >

      <div class="music-track-info">
        <strong>${escapeHTML(track.title)}</strong>
        <small>${escapeHTML(track.artist)} · YouTube</small>
      </div>

      <button
        class="music-play"
        type="button">
        ▶
      </button>
    `;

    row.querySelector('.music-play').onclick = () =>
      btPlayYouTube(track.videoId, track.title);

    row.querySelector('.music-track-info').onclick = () =>
      btPlayYouTube(track.videoId, track.title);

    list.appendChild(row);
  });
}

function btPlayYouTube(videoId, title = 'YouTube') {
  if (!videoId) return;

  // Remove old player
  document.getElementById('btYouTubePlayer')?.remove();

  const player = document.createElement('div');
  player.id = 'btYouTubePlayer';

  let currentMode = 'mini';

  player.innerHTML = `
    <div id="btYTBox">

      <div id="btYTHeader">

        <strong id="btYTTitle">
          ${escapeHTML(title)}
        </strong>

        <button
          type="button"
          id="btYTVertical"
          title="Vertical fullscreen"
          aria-label="Vertical fullscreen"
        >▯</button>

        <button
          type="button"
          id="btYTFullscreen"
          title="Fullscreen"
          aria-label="Fullscreen"
        >⛶</button>

        <button
          type="button"
          id="btYTClose"
          title="Close"
          aria-label="Close"
        >×</button>

      </div>

      <div id="btYTVideoWrap">

        <iframe
          id="btYTFrame"
          src="https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&playsinline=1"
          title="${escapeHTML(title)}"
          frameborder="0"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowfullscreen>
        </iframe>

      </div>

    </div>
  `;

  document.body.appendChild(player);

  const box =
    player.querySelector('#btYTBox');

  const header =
    player.querySelector('#btYTHeader');

  const videoWrap =
    player.querySelector('#btYTVideoWrap');

  const frame =
    player.querySelector('#btYTFrame');

  const titleEl =
    player.querySelector('#btYTTitle');

  const verticalBtn =
    player.querySelector('#btYTVertical');

  const fullscreenBtn =
    player.querySelector('#btYTFullscreen');

  const closeBtn =
    player.querySelector('#btYTClose');


  // ==================================================
  // COMMON STYLE
  // ==================================================

  player.style.cssText = `
    position:fixed;
    z-index:99999;
  `;

  header.style.cssText = `
    height:42px;
    display:flex;
    align-items:center;
    gap:8px;
    padding:0 10px;
    box-sizing:border-box;
    background:#0d0a12;
    color:#fff;
  `;

  titleEl.style.cssText = `
    flex:1;
    min-width:0;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
    font-size:13px;
  `;

  [verticalBtn, fullscreenBtn, closeBtn].forEach(btn => {

    btn.style.cssText = `
      width:34px;
      height:34px;
      padding:0;
      border:0;
      border-radius:9px;
      background:#21172c;
      color:#fff;
      font-size:20px;
      display:flex;
      align-items:center;
      justify-content:center;
      cursor:pointer;
    `;
  });

  videoWrap.style.cssText = `
    position:relative;
    background:#000;
    overflow:hidden;
  `;

  frame.style.cssText = `
    display:block;
    width:100%;
    height:100%;
    border:0;
    background:#000;
  `;


  // ==================================================
  // MINI PLAYER
  // ==================================================

  function showMini() {

    currentMode = 'mini';

    player.style.cssText = `
      position:fixed;
      left:12px;
      right:12px;
      bottom:82px;
      z-index:99999;
      display:flex;
      justify-content:center;
      pointer-events:none;
    `;

    box.style.cssText = `
      width:100%;
      max-width:520px;
      background:#0d0a12;
      border:1px solid #5d2a88;
      border-radius:18px;
      overflow:hidden;
      box-shadow:0 12px 40px rgba(0,0,0,.55);
      pointer-events:auto;
    `;

    header.style.display = 'flex';

    videoWrap.style.cssText = `
      position:relative;
      width:100%;
      aspect-ratio:16 / 9;
      background:#000;
      overflow:hidden;
    `;

    verticalBtn.style.display = 'flex';
    fullscreenBtn.style.display = 'flex';

    document.body.style.overflow = '';
  }


  // ==================================================
  // NORMAL FULLSCREEN
  // ==================================================

  function showFullscreen() {

    currentMode = 'fullscreen';

    player.style.cssText = `
      position:fixed;
      inset:0;
      width:100%;
      height:100%;
      z-index:99999;
      background:#000;
      display:flex;
      align-items:center;
      justify-content:center;
    `;

    box.style.cssText = `
      width:100%;
      height:100%;
      background:#000;
      display:flex;
      flex-direction:column;
      border-radius:0;
      overflow:hidden;
    `;

    header.style.display = 'flex';

    videoWrap.style.cssText = `
      flex:1;
      width:100%;
      min-height:0;
      background:#000;
      display:flex;
      align-items:center;
      justify-content:center;
    `;

    frame.style.cssText = `
      width:100%;
      height:100%;
      border:0;
      background:#000;
    `;

    verticalBtn.style.display = 'flex';
    fullscreenBtn.style.display = 'none';

    document.body.style.overflow = 'hidden';
  }


  // ==================================================
  // VERTICAL 9:16 FULLSCREEN
  // ==================================================

  function showVertical() {

    currentMode = 'vertical';

    player.style.cssText = `
      position:fixed;
      inset:0;
      width:100%;
      height:100%;
      z-index:99999;
      background:#000;
      display:flex;
      align-items:center;
      justify-content:center;
    `;

    box.style.cssText = `
      width:100%;
      height:100%;
      background:#000;
      display:flex;
      flex-direction:column;
      align-items:center;
      overflow:hidden;
      border-radius:0;
    `;

    header.style.display = 'flex';
    header.style.width = '100%';

    videoWrap.style.cssText = `
      flex:1;
      min-height:0;
      width:100%;
      background:#000;
      display:flex;
      align-items:center;
      justify-content:center;
      overflow:hidden;
    `;

    frame.style.cssText = `
      width:min(100vw, calc((100vh - 42px) * 9 / 16));
      height:min(calc(100vh - 42px), calc(100vw * 16 / 9));
      max-width:100%;
      max-height:100%;
      border:0;
      background:#000;
    `;

    verticalBtn.style.display = 'none';
    fullscreenBtn.style.display = 'flex';

    document.body.style.overflow = 'hidden';
  }


  // ==================================================
  // BUTTONS
  // ==================================================

  fullscreenBtn.onclick = () => {

    if (currentMode === 'fullscreen') {
      showMini();
    } else {
      showFullscreen();
    }
  };


  verticalBtn.onclick = () => {

    if (currentMode === 'vertical') {
      showMini();
    } else {
      showVertical();
    }
  };


  closeBtn.onclick = () => {

    // Fullscreen/Vertical -> first return to mini
    if (
      currentMode === 'fullscreen' ||
      currentMode === 'vertical'
    ) {

      showMini();
      return;
    }

    // Mini -> close player completely
    document.body.style.overflow = '';
    player.remove();
  };


  // ==================================================
  // START IN ORIGINAL MINI MODE
  // ==================================================

  showMini();
}
function btMusicRenderList(){
  const el=$('#btMusicList'); if(!el)return;
  if(!btMusicTracks.length){el.innerHTML='<div class="music-empty">No tracks yet. Artists can upload the first original or authorized song.</div>';return}
  el.innerHTML=btMusicTracks.map((t,i)=>`<div class="music-track">
    <img class="music-cover" src="${escapeAttr(btMusicCover(t))}" alt="">
    <div class="music-track-info"><strong>${escapeHTML(btMusicTitle(t))}</strong><small>${escapeHTML(btMusicArtist(t))}${btMusicField(t,'genre')?` • ${escapeHTML(btMusicField(t,'genre'))}`:''}</small></div>
    <button class="music-play" onclick="btMusicPlayIndex(${i})" aria-label="Play">▶</button>
  </div>`).join('');
}
async function btMusicPlayIndex(i){
  const t=btMusicTracks[i]; if(!t)return;
  const url=btMusicAudioUrl(t); if(!url)return toast('This track has no playable audio.');
  const a=btMusicEnsurePlayer();
  if(btMusicCurrent?.id===t.id && !a.paused){a.pause();return}
  btMusicCurrent=t;
  if(a.src!==url)a.src=url;
  try{await a.play();btMusicMountMini();btMusicUpdateMini();
    if(window.BeatTagAndroid&&typeof window.BeatTagAndroid.startBackgroundAudio==='function'){
      window.BeatTagAndroid.startBackgroundAudio(url,btMusicTitle(t),btMusicArtist(t),btMusicCover(t));
    }
    if(t.id) supabaseClient.rpc('record_music_play',{p_track_id:t.id}).then(()=>{}).catch(()=>{});
  }catch(e){console.error(e);toast('Could not play this track.')}
}
function btMusicNext(){
  if(!btMusicCurrent||!btMusicTracks.length)return;
  let i=btMusicTracks.findIndex(x=>x.id===btMusicCurrent.id); i=(i+1)%btMusicTracks.length; btMusicPlayIndex(i);
}
function btMusicPrev(){
  if(!btMusicCurrent||!btMusicTracks.length)return;
  let i=btMusicTracks.findIndex(x=>x.id===btMusicCurrent.id); i=(i-1+btMusicTracks.length)%btMusicTracks.length; btMusicPlayIndex(i);
}
function btMusicMountMini(){
  let el=document.getElementById('btMusicMini');
  if(!el){el=document.createElement('div');el.id='btMusicMini';el.className='music-mini-player hidden';document.body.appendChild(el)}
  btMusicUpdateMini();
}
function btMusicUpdateMini(){
  const el=document.getElementById('btMusicMini'); if(!el)return;
  if(!btMusicCurrent){el.classList.add('hidden');return}
  const a=btMusicEnsurePlayer(),pct=a.duration?Math.min(100,(a.currentTime/a.duration)*100):0;
  el.classList.remove('hidden');
  el.innerHTML=`<img src="${escapeAttr(btMusicCover(btMusicCurrent))}" alt=""><div class="music-mini-meta"><strong>${escapeHTML(btMusicTitle(btMusicCurrent))}</strong><small>${escapeHTML(btMusicArtist(btMusicCurrent))}</small></div><button onclick="btMusicPrev()">‹</button><button onclick="btMusicToggle()">${a.paused?'▶':'❚❚'}</button><div class="music-progress"><span style="width:${pct}%"></span></div>`;
}
async function btMusicToggle(){
  const a=btMusicEnsurePlayer(); if(!btMusicCurrent)return;
  if(a.paused){try{await a.play()}catch(_){}}else a.pause(); btMusicUpdateMini();
}
function openMusicUpload(){
  modal.classList.remove('hidden');
  modalCard.innerHTML=`<div class="modal-head"><div><h3>Upload Your Music</h3><p class="muted">Original or authorized music only.</p></div><button class="close" onclick="closeModal()">×</button></div>
  <div class="music-upload-grid">
    <input id="muTitle" maxlength="150" placeholder="Song title">
    <input id="muArtist" maxlength="100" placeholder="Artist / stage name">
    <select id="muLanguage"><option>Hindi</option><option>English</option><option>Marathi</option><option>Punjabi</option><option>Bhojpuri</option><option>Tamil</option><option>Telugu</option><option>Malayalam</option><option>Kannada</option><option>Bengali</option><option>Gujarati</option><option>Haryanvi</option><option>Other</option></select>
    <input id="muGenre" maxlength="60" placeholder="Genre — Pop, Rap, Lo-fi…">
    <label>Audio file<input id="muAudio" type="file" accept="audio/mpeg,audio/mp3,audio/wav,audio/webm,audio/mp4"></label>
    <label>Cover image<input id="muCover" type="file" accept="image/jpeg,image/png,image/webp"></label>
    <textarea id="muDesc" maxlength="1000" rows="3" placeholder="Description / credits"></textarea>
    <label class="bt-check"><input id="muChallenge" type="checkbox" checked> Allow this song to be used in BeatTag challenges</label>
    <label class="bt-check"><input id="muRights" type="checkbox"> I own this music or have permission to upload and distribute it.</label>
    <button id="muPublish" class="primary" onclick="publishMusicTrack()">Publish Song</button>
    <div id="muStatus" class="muted"></div>
  </div>`;
}
async function publishMusicTrack(){
  const title=($('#muTitle')?.value||'').trim(),artist=($('#muArtist')?.value||'').trim(),genre=($('#muGenre')?.value||'').trim(),language=$('#muLanguage')?.value||'Other';
  const audio=$('#muAudio')?.files?.[0],cover=$('#muCover')?.files?.[0],desc=($('#muDesc')?.value||'').trim(),rights=!!$('#muRights')?.checked;
  const btn=$('#muPublish'),status=$('#muStatus');
  if(!currentUserId)return toast('Please log in first.');
  if(!title||!artist||!audio)return toast('Song title, artist name and audio file are required.');
  if(!rights)return toast('Confirm that you own the music or have permission to upload it.');
  if(audio.size>50*1024*1024)return toast('Audio file must be 50MB or smaller.');
  try{
    btn.disabled=true;btn.textContent='Uploading…';status.textContent='Uploading audio…';
    const safe=s=>String(s).replace(/[^a-zA-Z0-9._-]/g,'_');
    const base=`${currentUserId}/${Date.now()}`;
    const audioPath=`${base}-${safe(audio.name)}`;
    let up=await supabaseClient.storage.from('music').upload(audioPath,audio,{upsert:false,contentType:audio.type||'audio/mpeg'});
    if(up.error)throw up.error;
    const audioUrl=supabaseClient.storage.from('music').getPublicUrl(audioPath).data.publicUrl;
    let coverUrl='';
    if(cover){
      status.textContent='Uploading cover…';
      const coverPath=`${base}-cover-${safe(cover.name)}`;
      const cu=await supabaseClient.storage.from('music').upload(coverPath,cover,{upsert:false,contentType:cover.type||'image/jpeg'});
      if(cu.error)throw cu.error;
      coverUrl=supabaseClient.storage.from('music').getPublicUrl(coverPath).data.publicUrl;
    }
    status.textContent='Publishing track…';
    let {data:artistRow,error:ae}=await supabaseClient.from('music_artists').select('*').eq('user_id',currentUserId).maybeSingle();
    if(ae)throw ae;
    if(!artistRow){
      const ai=await supabaseClient.from('music_artists').insert({user_id:currentUserId,stage_name:artist}).select().single();
      if(ai.error)throw ai.error; artistRow=ai.data;
    }
    const payload={artist_id:artistRow.id,uploaded_by:currentUserId,title,audio_url:audioUrl,cover_url:coverUrl,language,genre,description:desc,allow_challenge:!!$('#muChallenge')?.checked};
    let ins=await supabaseClient.from('music_tracks').insert(payload).select().single();
    if(ins.error){
      // Compatibility fallback for schemas that use owner_id instead of uploaded_by.
      delete payload.uploaded_by; payload.owner_id=currentUserId;
      ins=await supabaseClient.from('music_tracks').insert(payload).select().single();
    }
    if(ins.error)throw ins.error;
    closeModal();toast('Song published 🎵');go('music');
  }catch(err){console.error('Music publish error:',err);status.textContent=err.message||'Upload failed.';toast('Could not publish the song.');}
  finally{if(btn){btn.disabled=false;btn.textContent='Publish Song'}}
}
window.addEventListener('DOMContentLoaded',()=>btMusicMountMini());

/* =========================
   VIBEWORLD v1 — isolated module
   Local-first room prototype. Existing BeatTag systems are untouched.
========================= */
const BT_VIBE_KEY='beattag_vibeworld_v1';
const BT_VIBE_CATEGORIES=[
  {id:'chill',emoji:'🌴',name:'Chill Zone',sub:'Relax & Talk',glow:'#f97316'},
  {id:'night',emoji:'🌙',name:'Late Night',sub:'Deep Talks',glow:'#7c3cff'},
  {id:'gaming',emoji:'🎮',name:'Gaming Hub',sub:'Play Together',glow:'#22d3ee'},
  {id:'music',emoji:'🎵',name:'Music Vibes',sub:'Listen & Vibe',glow:'#3b82f6'},
  {id:'study',emoji:'📚',name:'Study Together',sub:'Learn & Grow',glow:'#60a5fa'},
  {id:'desi',emoji:'🇮🇳',name:'Desi Adda',sub:'Apni Baatein',glow:'#f59e0b'},
  {id:'creative',emoji:'🎨',name:'Creative Space',sub:'Art, Ideas, Projects',glow:'#ec4899'},
  {id:'global',emoji:'🌎',name:'Global Hangout',sub:'Meet the World',glow:'#06b6d4'}
];
const BT_VIBE_DEFAULT_ROOMS=[
  {id:'btv-chill-chat',category:'chill',name:'Chill & Chat',emoji:'🌴',members:128,tags:['Chatting','Friendly'],messages:[]},
  {id:'btv-music-chill',category:'chill',name:'Music & Chill',emoji:'🎧',members:56,tags:['Music','Chill'],messages:[]},
  {id:'btv-late-talks',category:'night',name:'Late Evening Talks',emoji:'🌃',members:43,tags:['Talk','Deep'],messages:[]},
  {id:'btv-good-vibes',category:'global',name:'Only Good Vibes',emoji:'✨',members:87,tags:['Fun','Open'],messages:[]},
  {id:'btv-friends',category:'global',name:'Make New Friends',emoji:'🤝',members:65,tags:['Social','Global'],messages:[]},
  {id:'btv-game',category:'gaming',name:'Game Squad',emoji:'🎮',members:34,tags:['Gaming','Squad'],messages:[]},
  {id:'btv-study',category:'study',name:'Focus Room',emoji:'📚',members:21,tags:['Study','Focus'],messages:[]},
  {id:'btv-desi',category:'desi',name:'Desi Adda',emoji:'🇮🇳',members:72,tags:['India','Friends'],messages:[]}
];
function btVibeLoad(){try{return JSON.parse(localStorage.getItem(BT_VIBE_KEY)||'null')||{rooms:BT_VIBE_DEFAULT_ROOMS,joined:[]}}catch(_){return{rooms:BT_VIBE_DEFAULT_ROOMS,joined:[]}}}
function btVibeSave(data){try{localStorage.setItem(BT_VIBE_KEY,JSON.stringify(data))}catch(_){}}
function btVibeProfileName(){const p=state?.profiles?.[state?.currentProfile];return p?.name||p?.handle?.replace(/^@/,'')||'You'}
function btVibeCategory(id){return BT_VIBE_CATEGORIES.find(v=>v.id===id)||BT_VIBE_CATEGORIES[0]}
function renderVibeWorld(search=''){
  const q=String(search||'').trim().toLowerCase();
  const data=btVibeLoad();
  const rooms=data.rooms.filter(r=>!q||r.name.toLowerCase().includes(q)||(r.tags||[]).join(' ').toLowerCase().includes(q));
  screenEl.innerHTML=`<section class="vibe-shell"><div class="vibe-hero"><h1>VibeWorld 🌐</h1><p>Enter your vibe. Meet real people. Talk. Play. Share. ✨</p><div class="vibe-search"><span>⌕</span><input id="btVibeSearch" placeholder="Search rooms, people or vibes…" value="${escapeAttr(search)}"></div></div>
  <div class="vibe-grid">${BT_VIBE_CATEGORIES.map(v=>`<button class="vibe-card" style="--vibe-glow:${v.glow}" onclick="renderVibeCategory('${v.id}')"><span class="vibe-emoji">${v.emoji}</span><strong>${escapeHTML(v.name)}</strong><small>${escapeHTML(v.sub)}</small></button>`).join('')}</div>
  <div class="vibe-banner">Good Vibes. Better People.<small>Find your space, meet people and enjoy the moment.</small></div>
  <div class="vibe-section-title"><h2>Live Rooms</h2><button class="ghost" onclick="openVibeGames()">🎮 Games</button></div><div id="btVibeRooms">${btVibeRoomsHTML(rooms)}</div><button class="primary vibe-create" onclick="openVibeCreateRoom()">＋ Create a Room</button></section>`;
  const input=$('#btVibeSearch'); if(input) input.oninput=()=>renderVibeWorld(input.value);
}
function btVibeRoomsHTML(rooms){return rooms.length?rooms.map(r=>`<div class="vibe-room"><div class="vibe-room-icon">${r.emoji||'✨'}</div><div class="vibe-room-info"><strong>${escapeHTML(r.name)}</strong><small><span class="vibe-live">● Live</span> · 👥 ${Number(r.members||1)} · ${escapeHTML((r.tags||[]).join(' · '))}</small></div><button class="secondary" onclick="openVibeRoom('${r.id}')">Join</button></div>`).join(''):`<div class="vibe-empty">No rooms match this search.</div>`}
function renderVibeCategory(categoryId){
  const cat=btVibeCategory(categoryId),data=btVibeLoad(),rooms=data.rooms.filter(r=>r.category===categoryId);
  screenEl.innerHTML=`<section class="vibe-shell"><button class="bt-back vibe-back" onclick="go('vibe')">← VibeWorld</button><div class="vibe-room-head"><div style="font-size:45px">${cat.emoji}</div><h2>${escapeHTML(cat.name)}</h2><p class="muted">${escapeHTML(cat.sub)}. Good vibes only.</p></div><div class="vibe-section-title"><h2>Live Rooms</h2><span class="muted">${rooms.length}</span></div>${btVibeRoomsHTML(rooms)}<button class="primary vibe-create" onclick="openVibeCreateRoom('${cat.id}')">＋ Create a Room</button></section>`;
}
function openVibeRoom(roomId){
  const data=btVibeLoad(),room=data.rooms.find(r=>r.id===roomId); if(!room)return renderVibeWorld();
  if(!data.joined.includes(roomId)){data.joined.push(roomId);room.members=Number(room.members||0)+1;btVibeSave(data)}
  const cat=btVibeCategory(room.category); const msgs=room.messages||[];
  screenEl.innerHTML=`<section class="vibe-shell"><button class="bt-back vibe-back" onclick="renderVibeCategory('${cat.id}')">← ${escapeHTML(cat.name)}</button><div class="vibe-room-head"><span class="vibe-live">● Live</span><h2>${escapeHTML(room.name)}</h2><div class="muted">👥 ${Number(room.members||1)} in room</div><div class="vibe-tags">${(room.tags||[]).map(t=>`<span class="vibe-tag">${escapeHTML(t)}</span>`).join('')}</div></div>
  <div class="vibe-tools"><button class="vibe-tool" onclick="toast('Mic controls will be enabled with live voice rooms.')"><span>🎙️</span>Mic</button><button class="vibe-tool" onclick="toast('Camera rooms are coming next.')"><span>📹</span>Cam</button><button class="vibe-tool" onclick="go('music')"><span>🎵</span>Music</button><button class="vibe-tool" onclick="openVibePoll('${room.id}')"><span>📊</span>Poll</button><button class="vibe-tool" onclick="openVibeGames()"><span>🎮</span>Games</button></div>
  <div id="btVibeChat" class="vibe-chat">${msgs.length?msgs.map(btVibeMessageHTML).join(''):`<div class="vibe-empty">Room is open. Say hello 👋</div>`}</div><button class="vibe-drop" onclick="go('create')">🔥 Drop a Beat <span class="muted" style="display:block;margin-top:4px">Turn this moment into a BeatTag challenge</span></button><div class="vibe-compose"><input id="btVibeMessage" maxlength="500" placeholder="Type a message…"><button class="vibe-round" onclick="sendVibeMessage('${room.id}')">➤</button></div></section>`;
  $('#btVibeMessage')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();sendVibeMessage(room.id)}});
}
function btVibeMessageHTML(m){return `<div class="vibe-message"><div class="vibe-avatar">${escapeHTML(String(m.name||'?').charAt(0).toUpperCase())}</div><div><strong>${escapeHTML(m.name||'User')}</strong> <small>${escapeHTML(m.time||'now')}</small><p>${escapeHTML(m.text||'')}</p></div></div>`}
function sendVibeMessage(roomId){const input=$('#btVibeMessage'),text=(input?.value||'').trim();if(!text)return;const data=btVibeLoad(),room=data.rooms.find(r=>r.id===roomId);if(!room)return;room.messages=room.messages||[];room.messages.push({name:btVibeProfileName(),text,time:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})});if(room.messages.length>100)room.messages=room.messages.slice(-100);btVibeSave(data);openVibeRoom(roomId)}
function openVibeCreateRoom(category='chill'){
  screenEl.innerHTML=`<section class="vibe-shell"><button class="bt-back vibe-back" onclick="go('vibe')">← VibeWorld</button><div class="section-title"><h2>Create a Room</h2></div><div class="panel vibe-form"><div class="field"><label>Room Name</label><input id="vibeRoomName" maxlength="60" placeholder="e.g. Late Night Vibes"></div><div class="field"><label>Select Vibe Category</label><select id="vibeRoomCategory">${BT_VIBE_CATEGORIES.map(v=>`<option value="${v.id}" ${v.id===category?'selected':''}>${v.emoji} ${escapeHTML(v.name)}</option>`).join('')}</select></div><div class="field"><label>Room Type</label><select id="vibeRoomType"><option value="public">🌐 Public — Anyone can join</option><option value="private">🔒 Private — Invite only</option></select></div><div class="field"><label>Max Members</label><select id="vibeRoomMax"><option>10</option><option>25</option><option selected>50</option><option>100</option></select></div><label class="vibe-switch-row">Allow Mic <input id="vibeMic" type="checkbox" checked></label><label class="vibe-switch-row">Allow Camera <input id="vibeCam" type="checkbox" checked></label><label class="vibe-switch-row">Allow Screen Share <input id="vibeScreen" type="checkbox"></label><div class="field" style="margin-top:14px"><label>Auto Delete Room</label><select id="vibeExpiry"><option value="24">24 Hours</option><option value="12">12 Hours</option><option value="6">6 Hours</option><option value="0">Keep Room</option></select></div><button class="primary" style="width:100%" onclick="createVibeRoom()">Create Room</button><p class="vibe-note">Private/live voice permissions are stored with the room. Real-time voice/video backend can be connected later without changing existing BeatTag features.</p></div></section>`;
}
function createVibeRoom(){const name=($('#vibeRoomName')?.value||'').trim();if(name.length<3)return toast('Enter a room name.');const category=$('#vibeRoomCategory')?.value||'chill',cat=btVibeCategory(category),data=btVibeLoad(),id='btv-'+Date.now();data.rooms.unshift({id,category,name,emoji:cat.emoji,members:1,tags:[$('#vibeRoomType')?.value==='private'?'Private':'Open',cat.name],owner:currentUserId||'local',maxMembers:Number($('#vibeRoomMax')?.value||50),allowMic:!!$('#vibeMic')?.checked,allowCamera:!!$('#vibeCam')?.checked,allowScreen:!!$('#vibeScreen')?.checked,expiryHours:Number($('#vibeExpiry')?.value||24),createdAt:Date.now(),messages:[]});btVibeSave(data);toast('Room created ✨');openVibeRoom(id)}
function openVibeGames(){screenEl.innerHTML=`<section class="vibe-shell"><button class="bt-back vibe-back" onclick="go('vibe')">← VibeWorld</button><div class="section-title"><h2>Mini Games 🎉</h2></div><p class="muted">Play together. Have fun. Make friends.</p><div class="vibe-games">${[['🎯','Emoji Guess','Guess the emoji word'],['❓','Quick Quiz','Test your knowledge'],['⚡','Word Race','Type fast. Win!'],['🎨','Draw & Guess','Draw and let others guess'],['🔥','Reaction Rush','Be the fastest!']].map(g=>`<div class="vibe-game"><span class="emoji">${g[0]}</span><div><strong>${g[1]}</strong><small>${g[2]}</small></div><button class="primary" onclick="startVibeMiniGame('${g[1]}')">Play</button></div>`).join('')}</div></section>`}
function startVibeMiniGame(name){if(name==='Emoji Guess'){const answers=['pizza','fire','music','india','game'];const emojis=['🍕','🔥','🎵','🇮🇳','🎮'];const i=Math.floor(Math.random()*answers.length);beatPrompt('Emoji Guess',`What is this? ${emojis[i]}`,'',{confirmText:'Answer'}).then(v=>{if(v===null)return;toast(String(v).trim().toLowerCase()===answers[i]?'Correct! 🎉':'Try again 😄')});return}if(name==='Quick Quiz'){beatConfirm('Quick Quiz','Which planet is known as the Red Planet?','Mars').then(v=>{if(v)toast('Correct! 🎉')});return}toast(`${name} is ready for the next multiplayer update.`)}
function openVibePoll(roomId){beatPrompt('Create Poll','Ask everyone in the room a quick question.','',{confirmText:'Post'}).then(v=>{if(v&&String(v).trim())toast('Poll posted 📊')})}
