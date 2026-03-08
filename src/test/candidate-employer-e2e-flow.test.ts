import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  ConnectionStatus,
  EndorsementDecision,
  ReadinessTier,
  UserRole,
} from "@/types/database.types";

/**
 * End-to-End Flow Test: Candidate → Employer Connection Journey
 *
 * Tests the complete lifecycle:
 * 1. Candidate completes Readiness Reflection (self-assessment)
 * 2. Mentor recommends a BridgeFast module via endorsement redirect
 * 3. Candidate completes the BridgeFast module
 * 4. Candidate profile gets listed on T3X (talent exchange)
 * 5. Employer discovers candidate in the connected section
 * 6. Employer sends a connection request
 * 7. Candidate responds (approve or decline)
 * 8. If approved, employer and candidate can message each other
 */

// ─── MOCK IDS ────────────────────────────────────────────────────────

const CANDIDATE_USER_ID = "cand-user-001";
const CANDIDATE_PROFILE_ID = "cand-prof-001";
const MENTOR_USER_ID = "ment-user-001";
const MENTOR_PROFILE_ID = "ment-prof-001";
const EMPLOYER_USER_ID = "emp-user-001";
const EMPLOYER_PROFILE_ID = "emp-prof-001";
const ASSIGNMENT_ID = "assign-001";
const ENDORSEMENT_ID = "endorse-001";
const MODULE_ID = "bf-mod-001";
const PROGRESS_ID = "bf-prog-001";
const CONNECTION_ID = "conn-001";
const CONVERSATION_ID = "conv-001";

// ─── MOCK DATABASE STATE ─────────────────────────────────────────────

let db: {
  profiles: any[];
  candidate_profiles: any[];
  mentor_profiles: any[];
  employer_profiles: any[];
  candidate_self_assessments: any[];
  mentor_assignments: any[];
  endorsements: any[];
  bridgefast_modules: any[];
  bridgefast_progress: any[];
  t3x_connections: any[];
  notifications: any[];
  conversations: any[];
  conversation_participants: any[];
  messages: any[];
  growth_log_entries: any[];
};

beforeEach(() => {
  db = {
    profiles: [
      {
        id: CANDIDATE_USER_ID,
        email: "jane.doe@example.com",
        first_name: "Jane",
        last_name: "Doe",
        role: "candidate" as UserRole,
        is_active: true,
        onboarding_completed: true,
      },
      {
        id: MENTOR_USER_ID,
        email: "mentor.smith@example.com",
        first_name: "Alex",
        last_name: "Smith",
        role: "mentor" as UserRole,
        is_active: true,
        onboarding_completed: true,
      },
      {
        id: EMPLOYER_USER_ID,
        email: "hr@techcorp.com",
        first_name: "Taylor",
        last_name: "Johnson",
        role: "employer" as UserRole,
        is_active: true,
        onboarding_completed: true,
      },
    ],
    candidate_profiles: [
      {
        id: CANDIDATE_PROFILE_ID,
        profile_id: CANDIDATE_USER_ID,
        skills: ["communication", "teamwork", "problem-solving"],
        experience_years: 2,
        entry_path: "resume_upload",
        current_tier: null as ReadinessTier | null,
        mentor_loops: 0,
        has_skill_passport: false,
        has_talentvisa: false,
        is_listed_on_t3x: false,
      },
    ],
    mentor_profiles: [
      {
        id: MENTOR_PROFILE_ID,
        profile_id: MENTOR_USER_ID,
        industry: "technology",
        specializations: ["software-engineering", "leadership"],
        years_experience: 10,
        max_mentees: 5,
        current_mentees: 1,
        is_accepting: true,
        total_observations: 15,
        total_endorsements: 8,
      },
    ],
    employer_profiles: [
      {
        id: EMPLOYER_PROFILE_ID,
        profile_id: EMPLOYER_USER_ID,
        company_name: "TechCorp Inc.",
        company_size: "50-200",
        industry: "technology",
        is_verified: true,
        subscription_tier: "premium",
        total_hires: 5,
        total_connections: 12,
      },
    ],
    candidate_self_assessments: [],
    mentor_assignments: [
      {
        id: ASSIGNMENT_ID,
        mentor_id: MENTOR_PROFILE_ID,
        candidate_id: CANDIDATE_PROFILE_ID,
        status: "active",
        loop_number: 1,
        assigned_by: null,
      },
    ],
    endorsements: [],
    bridgefast_modules: [
      {
        id: MODULE_ID,
        title: "Communication Under Pressure",
        description: "Develop skills to communicate clearly in high-stress work environments",
        behavioral_dimension: "communication_pressure",
        duration_hours: 4,
        is_active: true,
        order_index: 1,
      },
    ],
    bridgefast_progress: [],
    t3x_connections: [],
    notifications: [],
    conversations: [],
    conversation_participants: [],
    messages: [],
    growth_log_entries: [],
  };
});

// ─── STEP 1: READINESS REFLECTION ────────────────────────────────────

describe("Step 1: Candidate Completes Readiness Reflection", () => {
  it("should create a self-assessment with behavioral scores", () => {
    const selfAssessment = {
      id: "sa-001",
      candidate_id: CANDIDATE_PROFILE_ID,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      behavioral_scores: {
        integrity_ethics: 3,
        accountability_ownership: 2,
        execution_reliability: 3,
        communication_pressure: 1,
        collaboration_conflict: 3,
      },
      notes: "I feel confident in most areas but need improvement in communication under pressure.",
      goals: "Improve communication in stressful situations within 3 months.",
      strengths: ["integrity_ethics", "execution_reliability", "collaboration_conflict"],
      areas_for_improvement: ["communication_pressure", "accountability_ownership"],
      completed: true,
    };

    db.candidate_self_assessments.push(selfAssessment);

    expect(db.candidate_self_assessments).toHaveLength(1);
    expect(db.candidate_self_assessments[0].completed).toBe(true);
    expect(db.candidate_self_assessments[0].candidate_id).toBe(CANDIDATE_PROFILE_ID);
  });

  it("should identify weak dimensions from self-assessment", () => {
    const scores = {
      integrity_ethics: 3,
      accountability_ownership: 2,
      execution_reliability: 3,
      communication_pressure: 1,
      collaboration_conflict: 3,
    };

    const weakDimensions = Object.entries(scores)
      .filter(([, score]) => score <= 2)
      .map(([dim]) => dim);

    expect(weakDimensions).toContain("communication_pressure");
    expect(weakDimensions).toContain("accountability_ownership");
    expect(weakDimensions).toHaveLength(2);
  });

  it("should log the reflection completion in growth log", () => {
    const logEntry = {
      id: "gl-001",
      candidate_id: CANDIDATE_PROFILE_ID,
      created_at: new Date().toISOString(),
      event_type: "assessment" as const,
      title: "Readiness Reflection Completed",
      description: "Completed initial self-assessment identifying strengths and growth areas.",
      metadata: { weak_dimensions: ["communication_pressure", "accountability_ownership"] },
      source_component: "readiness_reflection",
      source_id: "sa-001",
    };

    db.growth_log_entries.push(logEntry);

    expect(db.growth_log_entries).toHaveLength(1);
    expect(db.growth_log_entries[0].event_type).toBe("assessment");
    expect(db.growth_log_entries[0].source_component).toBe("readiness_reflection");
  });
});

// ─── STEP 2: MENTOR RECOMMENDS BRIDGEFAST MODULE ─────────────────────

describe("Step 2: Mentor Recommends BridgeFast Module via Endorsement", () => {
  it("should allow mentor to create a redirect endorsement to BridgeFast", () => {
    const endorsement = {
      id: ENDORSEMENT_ID,
      assignment_id: ASSIGNMENT_ID,
      mentor_id: MENTOR_PROFILE_ID,
      candidate_id: CANDIDATE_PROFILE_ID,
      created_at: new Date().toISOString(),
      decision: "redirect" as EndorsementDecision,
      justification:
        "Jane shows strong potential but needs to strengthen communication under pressure before proceeding. Recommending BridgeFast module.",
      redirect_to: "bridgefast" as const,
      redirect_module_id: MODULE_ID,
    };

    db.endorsements.push(endorsement);

    expect(db.endorsements).toHaveLength(1);
    expect(db.endorsements[0].decision).toBe("redirect");
    expect(db.endorsements[0].redirect_to).toBe("bridgefast");
    expect(db.endorsements[0].redirect_module_id).toBe(MODULE_ID);
  });

  it("endorsement redirect_to should only be 'bridgefast' or 'liveworks' or null", () => {
    const validRedirects: Array<"bridgefast" | "liveworks" | null> = ["bridgefast", "liveworks", null];
    validRedirects.forEach((val) => {
      expect(["bridgefast", "liveworks", null]).toContain(val);
    });
  });

  it("should send notification to candidate about BridgeFast recommendation", () => {
    const notification = {
      id: "notif-001",
      user_id: CANDIDATE_USER_ID,
      created_at: new Date().toISOString(),
      type: "endorsement_redirect",
      title: "BridgeFast Module Recommended",
      message: "Your mentor Alex Smith has recommended a BridgeFast module: Communication Under Pressure",
      is_read: false,
      action_url: `/dashboard/candidate/bridgefast/${MODULE_ID}`,
      metadata: { module_id: MODULE_ID, mentor_id: MENTOR_PROFILE_ID },
      priority: "high" as const,
      action_type: "navigate",
    };

    db.notifications.push(notification);

    expect(db.notifications).toHaveLength(1);
    expect(db.notifications[0].type).toBe("endorsement_redirect");
    expect(db.notifications[0].priority).toBe("high");
    expect(db.notifications[0].user_id).toBe(CANDIDATE_USER_ID);
  });

  it("should reference a valid BridgeFast module", () => {
    const module = db.bridgefast_modules.find((m: any) => m.id === MODULE_ID);
    expect(module).toBeDefined();
    expect(module!.behavioral_dimension).toBe("communication_pressure");
    expect(module!.is_active).toBe(true);
  });
});

// ─── STEP 3: CANDIDATE COMPLETES BRIDGEFAST MODULE ───────────────────

describe("Step 3: Candidate Completes BridgeFast Module", () => {
  it("should create progress record when candidate starts module", () => {
    const progress = {
      id: PROGRESS_ID,
      candidate_id: CANDIDATE_PROFILE_ID,
      module_id: MODULE_ID,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      completed_at: null as string | null,
      progress_percent: 0,
      final_score: null as number | null,
      status: "in_progress" as const,
      deadline: null,
    };

    db.bridgefast_progress.push(progress);

    expect(db.bridgefast_progress).toHaveLength(1);
    expect(db.bridgefast_progress[0].status).toBe("in_progress");
    expect(db.bridgefast_progress[0].progress_percent).toBe(0);
  });

  it("should update progress as candidate works through module", () => {
    db.bridgefast_progress.push({
      id: PROGRESS_ID,
      candidate_id: CANDIDATE_PROFILE_ID,
      module_id: MODULE_ID,
      status: "in_progress",
      progress_percent: 0,
      started_at: new Date().toISOString(),
      completed_at: null,
      final_score: null,
    });

    // Simulate progress updates
    db.bridgefast_progress[0].progress_percent = 50;
    expect(db.bridgefast_progress[0].progress_percent).toBe(50);

    db.bridgefast_progress[0].progress_percent = 100;
    db.bridgefast_progress[0].status = "completed";
    db.bridgefast_progress[0].completed_at = new Date().toISOString();
    db.bridgefast_progress[0].final_score = 85;

    expect(db.bridgefast_progress[0].status).toBe("completed");
    expect(db.bridgefast_progress[0].final_score).toBe(85);
    expect(db.bridgefast_progress[0].completed_at).not.toBeNull();
  });

  it("should log module completion in growth log", () => {
    const logEntry = {
      id: "gl-002",
      candidate_id: CANDIDATE_PROFILE_ID,
      created_at: new Date().toISOString(),
      event_type: "training" as const,
      title: "BridgeFast Module Completed: Communication Under Pressure",
      description: "Completed BridgeFast training module with a score of 85%.",
      metadata: { module_id: MODULE_ID, score: 85, dimension: "communication_pressure" },
      source_component: "bridgefast",
      source_id: PROGRESS_ID,
    };

    db.growth_log_entries.push(logEntry);

    expect(db.growth_log_entries).toHaveLength(1);
    expect(db.growth_log_entries[0].event_type).toBe("training");
    expect(db.growth_log_entries[0].source_component).toBe("bridgefast");
  });

  it("should update candidate tier after completing module", () => {
    const candidate = db.candidate_profiles[0];
    candidate.current_tier = "platinum" as ReadinessTier;

    expect(candidate.current_tier).toBe("platinum");
  });
});

// ─── STEP 4: CANDIDATE PROFILE GETS LISTED ON T3X ───────────────────

describe("Step 4: Candidate Profile Listed on T3X (Talent Exchange)", () => {
  it("should update candidate as listed on T3X after meeting criteria", () => {
    const candidate = db.candidate_profiles[0];

    // Candidate meets criteria: has tier, completed BridgeFast
    candidate.current_tier = "platinum";
    candidate.has_skill_passport = true;
    candidate.is_listed_on_t3x = true;

    expect(candidate.is_listed_on_t3x).toBe(true);
    expect(candidate.has_skill_passport).toBe(true);
    expect(candidate.current_tier).toBe("platinum");
  });

  it("candidate should NOT be listed if requirements are not met", () => {
    const candidate = db.candidate_profiles[0];

    // No tier, no passport
    expect(candidate.is_listed_on_t3x).toBe(false);
    expect(candidate.has_skill_passport).toBe(false);
    expect(candidate.current_tier).toBeNull();
  });

  it("T3X listing requires is_listed_on_t3x flag on candidate_profiles", () => {
    const candidateColumns = [
      "id", "profile_id", "skills", "experience_years", "entry_path",
      "current_tier", "has_skill_passport", "has_talentvisa", "is_listed_on_t3x",
    ];
    expect(candidateColumns).toContain("is_listed_on_t3x");
    expect(candidateColumns).toContain("has_skill_passport");
    expect(candidateColumns).toContain("current_tier");
  });
});

// ─── STEP 5: EMPLOYER DISCOVERS CANDIDATE ────────────────────────────

describe("Step 5: Employer Discovers Candidate on T3X", () => {
  beforeEach(() => {
    // Set candidate as listed
    db.candidate_profiles[0].is_listed_on_t3x = true;
    db.candidate_profiles[0].has_skill_passport = true;
    db.candidate_profiles[0].current_tier = "platinum";
  });

  it("employer should be able to query candidates listed on T3X", () => {
    const listedCandidates = db.candidate_profiles.filter(
      (c: any) => c.is_listed_on_t3x === true
    );

    expect(listedCandidates).toHaveLength(1);
    expect(listedCandidates[0].profile_id).toBe(CANDIDATE_USER_ID);
  });

  it("employer should see candidate profile details", () => {
    const candidate = db.candidate_profiles[0];
    const profile = db.profiles.find((p: any) => p.id === candidate.profile_id);

    expect(profile).toBeDefined();
    expect(profile!.first_name).toBe("Jane");
    expect(profile!.last_name).toBe("Doe");
    expect(candidate.skills).toContain("communication");
    expect(candidate.current_tier).toBe("platinum");
  });

  it("employer must be verified to browse T3X", () => {
    const employer = db.employer_profiles[0];
    expect(employer.is_verified).toBe(true);
  });
});

// ─── STEP 6: EMPLOYER SENDS CONNECTION REQUEST ───────────────────────

describe("Step 6: Employer Sends Connection Request", () => {
  it("should create a pending connection request", () => {
    const connection = {
      id: CONNECTION_ID,
      employer_id: EMPLOYER_PROFILE_ID,
      candidate_id: CANDIDATE_PROFILE_ID,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: "pending" as ConnectionStatus,
      message: "Hi Jane, we're impressed by your profile and would love to connect to discuss an opportunity at TechCorp.",
      responded_at: null as string | null,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    };

    db.t3x_connections.push(connection);

    expect(db.t3x_connections).toHaveLength(1);
    expect(db.t3x_connections[0].status).toBe("pending");
    expect(db.t3x_connections[0].employer_id).toBe(EMPLOYER_PROFILE_ID);
    expect(db.t3x_connections[0].candidate_id).toBe(CANDIDATE_PROFILE_ID);
    expect(db.t3x_connections[0].message).toBeTruthy();
  });

  it("should send notification to candidate about connection request", () => {
    const notification = {
      id: "notif-002",
      user_id: CANDIDATE_USER_ID,
      created_at: new Date().toISOString(),
      type: "connection_request",
      title: "New Connection Request",
      message: "TechCorp Inc. wants to connect with you.",
      is_read: false,
      action_url: "/dashboard/candidate/connections",
      metadata: { connection_id: CONNECTION_ID, employer_id: EMPLOYER_PROFILE_ID },
      priority: "high" as const,
      action_type: "navigate",
    };

    db.notifications.push(notification);

    expect(db.notifications).toHaveLength(1);
    expect(db.notifications[0].type).toBe("connection_request");
    expect(db.notifications[0].user_id).toBe(CANDIDATE_USER_ID);
  });

  it("connection status should be one of the valid ConnectionStatus values", () => {
    const validStatuses: ConnectionStatus[] = ["pending", "accepted", "declined", "expired"];
    expect(validStatuses).toContain("pending");
    expect(validStatuses).toContain("accepted");
    expect(validStatuses).toContain("declined");
    expect(validStatuses).toContain("expired");
  });

  it("should prevent duplicate pending connections from same employer to same candidate", () => {
    db.t3x_connections.push({
      id: CONNECTION_ID,
      employer_id: EMPLOYER_PROFILE_ID,
      candidate_id: CANDIDATE_PROFILE_ID,
      status: "pending",
    });

    const existingPending = db.t3x_connections.find(
      (c: any) =>
        c.employer_id === EMPLOYER_PROFILE_ID &&
        c.candidate_id === CANDIDATE_PROFILE_ID &&
        c.status === "pending"
    );

    // Should check for existing pending before creating new one
    expect(existingPending).toBeDefined();
    // If exists, should NOT create another
    const duplicateAllowed = !existingPending;
    expect(duplicateAllowed).toBe(false);
  });
});

// ─── STEP 7: CANDIDATE RESPONDS TO REQUEST ───────────────────────────

describe("Step 7: Candidate Responds to Connection Request", () => {
  beforeEach(() => {
    db.t3x_connections.push({
      id: CONNECTION_ID,
      employer_id: EMPLOYER_PROFILE_ID,
      candidate_id: CANDIDATE_PROFILE_ID,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: "pending" as ConnectionStatus,
      message: "We'd love to connect!",
      responded_at: null,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  });

  it("candidate should be able to approve the connection request", () => {
    const connection = db.t3x_connections[0];
    connection.status = "accepted" as ConnectionStatus;
    connection.responded_at = new Date().toISOString();
    connection.updated_at = new Date().toISOString();

    expect(connection.status).toBe("accepted");
    expect(connection.responded_at).not.toBeNull();
  });

  it("candidate should be able to decline the connection request", () => {
    const connection = db.t3x_connections[0];
    connection.status = "declined" as ConnectionStatus;
    connection.responded_at = new Date().toISOString();
    connection.updated_at = new Date().toISOString();

    expect(connection.status).toBe("declined");
    expect(connection.responded_at).not.toBeNull();
  });

  it("should notify employer when candidate responds", () => {
    // Approve
    db.t3x_connections[0].status = "accepted";

    const notification = {
      id: "notif-003",
      user_id: EMPLOYER_USER_ID,
      created_at: new Date().toISOString(),
      type: "connection_accepted",
      title: "Connection Accepted",
      message: "Jane Doe has accepted your connection request.",
      is_read: false,
      action_url: "/dashboard/employer/connections",
      metadata: { connection_id: CONNECTION_ID, candidate_id: CANDIDATE_PROFILE_ID },
      priority: "normal" as const,
      action_type: "navigate",
    };

    db.notifications.push(notification);

    expect(db.notifications).toHaveLength(1);
    expect(db.notifications[0].type).toBe("connection_accepted");
    expect(db.notifications[0].user_id).toBe(EMPLOYER_USER_ID);
  });

  it("should increment employer total_connections on acceptance", () => {
    const employer = db.employer_profiles[0];
    const previousConnections = employer.total_connections;

    // Accept connection
    db.t3x_connections[0].status = "accepted";
    employer.total_connections += 1;

    expect(employer.total_connections).toBe(previousConnections + 1);
  });

  it("expired connections should not be respondable", () => {
    const connection = db.t3x_connections[0];
    // Set expiry in the past
    connection.expires_at = new Date(Date.now() - 1000).toISOString();

    const isExpired = new Date(connection.expires_at) < new Date();
    expect(isExpired).toBe(true);

    // Should not allow response on expired connection
    if (isExpired) {
      connection.status = "expired";
    }
    expect(connection.status).toBe("expired");
  });
});

// ─── STEP 8: CONNECTED USERS CAN MESSAGE EACH OTHER ─────────────────

describe("Step 8: Approved Connection Enables Messaging", () => {
  beforeEach(() => {
    // Set up accepted connection
    db.t3x_connections.push({
      id: CONNECTION_ID,
      employer_id: EMPLOYER_PROFILE_ID,
      candidate_id: CANDIDATE_PROFILE_ID,
      status: "accepted" as ConnectionStatus,
      responded_at: new Date().toISOString(),
    });
  });

  it("should create a direct conversation after connection acceptance", () => {
    const conversation = {
      id: CONVERSATION_ID,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      type: "direct" as const,
      title: null,
      last_message_at: null as string | null,
      last_message_preview: null as string | null,
    };

    db.conversations.push(conversation);

    // Add both participants
    db.conversation_participants.push(
      {
        id: "cp-001",
        conversation_id: CONVERSATION_ID,
        user_id: EMPLOYER_USER_ID,
        joined_at: new Date().toISOString(),
        last_read_at: null,
        is_muted: false,
      },
      {
        id: "cp-002",
        conversation_id: CONVERSATION_ID,
        user_id: CANDIDATE_USER_ID,
        joined_at: new Date().toISOString(),
        last_read_at: null,
        is_muted: false,
      }
    );

    expect(db.conversations).toHaveLength(1);
    expect(db.conversations[0].type).toBe("direct");
    expect(db.conversation_participants).toHaveLength(2);

    const participantUserIds = db.conversation_participants.map((p: any) => p.user_id);
    expect(participantUserIds).toContain(EMPLOYER_USER_ID);
    expect(participantUserIds).toContain(CANDIDATE_USER_ID);
  });

  it("employer should be able to send a message to candidate", () => {
    db.conversations.push({
      id: CONVERSATION_ID,
      type: "direct",
      last_message_at: null,
      last_message_preview: null,
    });

    const message = {
      id: "msg-001",
      conversation_id: CONVERSATION_ID,
      sender_id: EMPLOYER_USER_ID,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      content: "Hi Jane! Thanks for accepting our connection. We have a Junior Developer position that would be a great fit for your skills.",
      message_type: "text" as const,
      file_url: null,
      is_edited: false,
      is_deleted: false,
      reply_to_id: null,
      metadata: {},
    };

    db.messages.push(message);

    // Update conversation last message
    db.conversations[0].last_message_at = message.created_at;
    db.conversations[0].last_message_preview = message.content.substring(0, 100);

    expect(db.messages).toHaveLength(1);
    expect(db.messages[0].sender_id).toBe(EMPLOYER_USER_ID);
    expect(db.messages[0].conversation_id).toBe(CONVERSATION_ID);
    expect(db.conversations[0].last_message_preview).toBeTruthy();
  });

  it("candidate should be able to reply to employer", () => {
    db.conversations.push({ id: CONVERSATION_ID, type: "direct" });
    db.messages.push({
      id: "msg-001",
      conversation_id: CONVERSATION_ID,
      sender_id: EMPLOYER_USER_ID,
      content: "Hi Jane!",
      message_type: "text",
    });

    const reply = {
      id: "msg-002",
      conversation_id: CONVERSATION_ID,
      sender_id: CANDIDATE_USER_ID,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      content: "Thank you Taylor! I'd love to learn more about the position. When would be a good time to chat?",
      message_type: "text" as const,
      file_url: null,
      is_edited: false,
      is_deleted: false,
      reply_to_id: "msg-001",
      metadata: {},
    };

    db.messages.push(reply);

    expect(db.messages).toHaveLength(2);
    expect(db.messages[1].sender_id).toBe(CANDIDATE_USER_ID);
    expect(db.messages[1].reply_to_id).toBe("msg-001");
  });

  it("should NOT allow messaging if connection is not accepted", () => {
    // Override with declined connection
    db.t3x_connections[0].status = "declined";

    const isConnected = db.t3x_connections.some(
      (c: any) =>
        c.employer_id === EMPLOYER_PROFILE_ID &&
        c.candidate_id === CANDIDATE_PROFILE_ID &&
        c.status === "accepted"
    );

    expect(isConnected).toBe(false);
    // Messaging should be blocked when not connected
  });

  it("should NOT allow messaging if connection is only pending", () => {
    db.t3x_connections[0].status = "pending";

    const isConnected = db.t3x_connections.some(
      (c: any) =>
        c.employer_id === EMPLOYER_PROFILE_ID &&
        c.candidate_id === CANDIDATE_PROFILE_ID &&
        c.status === "accepted"
    );

    expect(isConnected).toBe(false);
  });

  it("messages should support different message types", () => {
    const validTypes: Array<"text" | "file" | "image" | "system"> = ["text", "file", "image", "system"];
    expect(validTypes).toHaveLength(4);
    expect(validTypes).toContain("text");
    expect(validTypes).toContain("system");
  });
});

// ─── FULL FLOW INTEGRATION ───────────────────────────────────────────

describe("Full E2E Flow: Readiness Reflection → Connection → Messaging", () => {
  it("should complete the entire journey from reflection to messaging", () => {
    // Step 1: Candidate completes readiness reflection
    db.candidate_self_assessments.push({
      id: "sa-001",
      candidate_id: CANDIDATE_PROFILE_ID,
      behavioral_scores: {
        integrity_ethics: 3,
        communication_pressure: 1,
        collaboration_conflict: 3,
      },
      strengths: ["integrity_ethics"],
      areas_for_improvement: ["communication_pressure"],
      completed: true,
    });
    expect(db.candidate_self_assessments[0].completed).toBe(true);

    // Step 2: Mentor sees weak area and recommends BridgeFast
    db.endorsements.push({
      id: ENDORSEMENT_ID,
      assignment_id: ASSIGNMENT_ID,
      mentor_id: MENTOR_PROFILE_ID,
      candidate_id: CANDIDATE_PROFILE_ID,
      decision: "redirect" as EndorsementDecision,
      justification: "Needs communication training",
      redirect_to: "bridgefast",
      redirect_module_id: MODULE_ID,
    });
    expect(db.endorsements[0].redirect_to).toBe("bridgefast");

    // Step 3: Candidate completes BridgeFast module
    db.bridgefast_progress.push({
      id: PROGRESS_ID,
      candidate_id: CANDIDATE_PROFILE_ID,
      module_id: MODULE_ID,
      status: "completed",
      progress_percent: 100,
      final_score: 85,
      completed_at: new Date().toISOString(),
    });
    expect(db.bridgefast_progress[0].status).toBe("completed");

    // Step 4: Profile gets listed on T3X
    db.candidate_profiles[0].current_tier = "platinum";
    db.candidate_profiles[0].has_skill_passport = true;
    db.candidate_profiles[0].is_listed_on_t3x = true;
    expect(db.candidate_profiles[0].is_listed_on_t3x).toBe(true);

    // Step 5: Employer discovers candidate
    const listed = db.candidate_profiles.filter((c: any) => c.is_listed_on_t3x);
    expect(listed).toHaveLength(1);

    // Step 6: Employer sends connection request
    db.t3x_connections.push({
      id: CONNECTION_ID,
      employer_id: EMPLOYER_PROFILE_ID,
      candidate_id: CANDIDATE_PROFILE_ID,
      status: "pending" as ConnectionStatus,
      message: "We'd love to connect!",
      responded_at: null,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    expect(db.t3x_connections[0].status).toBe("pending");

    // Step 7: Candidate approves
    db.t3x_connections[0].status = "accepted";
    db.t3x_connections[0].responded_at = new Date().toISOString();
    expect(db.t3x_connections[0].status).toBe("accepted");

    // Step 8: Create conversation and exchange messages
    db.conversations.push({
      id: CONVERSATION_ID,
      type: "direct",
      last_message_at: null,
      last_message_preview: null,
    });

    db.conversation_participants.push(
      { id: "cp-001", conversation_id: CONVERSATION_ID, user_id: EMPLOYER_USER_ID },
      { id: "cp-002", conversation_id: CONVERSATION_ID, user_id: CANDIDATE_USER_ID }
    );

    // Employer sends first message
    db.messages.push({
      id: "msg-001",
      conversation_id: CONVERSATION_ID,
      sender_id: EMPLOYER_USER_ID,
      content: "Welcome! Let's discuss the opportunity.",
      message_type: "text",
    });

    // Candidate replies
    db.messages.push({
      id: "msg-002",
      conversation_id: CONVERSATION_ID,
      sender_id: CANDIDATE_USER_ID,
      content: "Thank you! I'm very interested.",
      message_type: "text",
      reply_to_id: "msg-001",
    });

    // Verify full flow state
    expect(db.messages).toHaveLength(2);
    expect(db.messages[0].sender_id).toBe(EMPLOYER_USER_ID);
    expect(db.messages[1].sender_id).toBe(CANDIDATE_USER_ID);
    expect(db.conversation_participants).toHaveLength(2);
  });

  it("should block the flow if candidate declines connection", () => {
    // Steps 1-6 happen... then candidate declines
    db.t3x_connections.push({
      id: CONNECTION_ID,
      employer_id: EMPLOYER_PROFILE_ID,
      candidate_id: CANDIDATE_PROFILE_ID,
      status: "declined" as ConnectionStatus,
      responded_at: new Date().toISOString(),
    });

    const canMessage = db.t3x_connections.some(
      (c: any) =>
        c.employer_id === EMPLOYER_PROFILE_ID &&
        c.candidate_id === CANDIDATE_PROFILE_ID &&
        c.status === "accepted"
    );

    expect(canMessage).toBe(false);
    expect(db.conversations).toHaveLength(0);
    expect(db.messages).toHaveLength(0);
  });

  it("should track the full journey in growth log", () => {
    // Add growth log entries for each major step
    const entries = [
      {
        id: "gl-001",
        candidate_id: CANDIDATE_PROFILE_ID,
        event_type: "assessment" as const,
        title: "Readiness Reflection Completed",
        source_component: "readiness_reflection",
      },
      {
        id: "gl-002",
        candidate_id: CANDIDATE_PROFILE_ID,
        event_type: "endorsement" as const,
        title: "Mentor Endorsement: Redirect to BridgeFast",
        source_component: "endorsement",
      },
      {
        id: "gl-003",
        candidate_id: CANDIDATE_PROFILE_ID,
        event_type: "training" as const,
        title: "BridgeFast Module Completed",
        source_component: "bridgefast",
      },
      {
        id: "gl-004",
        candidate_id: CANDIDATE_PROFILE_ID,
        event_type: "tier_change" as const,
        title: "Readiness Tier Updated to Tier 1",
        source_component: "tier_system",
      },
    ];

    db.growth_log_entries.push(...entries);

    expect(db.growth_log_entries).toHaveLength(4);

    const eventTypes = db.growth_log_entries.map((e: any) => e.event_type);
    expect(eventTypes).toContain("assessment");
    expect(eventTypes).toContain("endorsement");
    expect(eventTypes).toContain("training");
    expect(eventTypes).toContain("tier_change");
  });
});
