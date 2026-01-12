/**
 * Tests for Mark Paper as Read API endpoint
 * 
 * Tests the /api/papers/[id]/mark-read POST endpoint functionality
 * including status transitions, inLibrary preservation, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { PaperStatus } from "@prisma/client";

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
    paper: {
      findUnique: vi.fn(),
    },
    userPaperState: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

describe("POST /api/papers/[id]/mark-read", () => {
  const mockUserId = "user-123";
  const mockPaperId = "paper-456";
  const mockUser = { id: mockUserId };
  const mockPaper = { id: mockPaperId };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock setup
    (auth as any).mockResolvedValue({
      user: { email: "test@example.com" },
    });
    
    (db.user.findUnique as any).mockResolvedValue(mockUser);
    (db.paper.findUnique as any).mockResolvedValue(mockPaper);
  });

  describe("Authentication and Authorization", () => {
    it("should return 401 if user is not authenticated", async () => {
      (auth as any).mockResolvedValue(null);

      const request = new Request("http://localhost/api/papers/123/mark-read", {
        method: "POST",
      });

      const response = await POST(request, { params: { id: mockPaperId } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 if user is not found", async () => {
      (db.user.findUnique as any).mockResolvedValue(null);

      const request = new Request("http://localhost/api/papers/123/mark-read", {
        method: "POST",
      });

      const response = await POST(request, { params: { id: mockPaperId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("User not found");
    });

    it("should return 404 if paper is not found", async () => {
      (db.paper.findUnique as any).mockResolvedValue(null);

      const request = new Request("http://localhost/api/papers/123/mark-read", {
        method: "POST",
      });

      const response = await POST(request, { params: { id: mockPaperId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Paper not found");
    });
  });

  describe("Status Transitions", () => {
    it("should update status from NEW to READ", async () => {
      const existingState = {
        id: "state-123",
        userId: mockUserId,
        paperId: mockPaperId,
        status: PaperStatus.NEW,
        inLibrary: true,
      };

      (db.userPaperState.findUnique as any).mockResolvedValue(existingState);
      (db.userPaperState.update as any).mockResolvedValue({
        ...existingState,
        status: PaperStatus.READ,
      });

      const request = new Request("http://localhost/api/papers/123/mark-read", {
        method: "POST",
      });

      const response = await POST(request, { params: { id: mockPaperId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe(PaperStatus.READ);
      expect(data.inLibrary).toBe(true);
      expect(db.userPaperState.update).toHaveBeenCalledWith({
        where: {
          userId_paperId: {
            userId: mockUserId,
            paperId: mockPaperId,
          },
        },
        data: {
          status: PaperStatus.READ,
        },
      });
    });

    it("should update status from BEING_PROCESSED to READ", async () => {
      const existingState = {
        id: "state-123",
        userId: mockUserId,
        paperId: mockPaperId,
        status: PaperStatus.BEING_PROCESSED,
        inLibrary: false,
      };

      (db.userPaperState.findUnique as any).mockResolvedValue(existingState);
      (db.userPaperState.update as any).mockResolvedValue({
        ...existingState,
        status: PaperStatus.READ,
      });

      const request = new Request("http://localhost/api/papers/123/mark-read", {
        method: "POST",
      });

      const response = await POST(request, { params: { id: mockPaperId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe(PaperStatus.READ);
      expect(data.inLibrary).toBe(false); // Preserved
    });

    it("should return success if status is already READ", async () => {
      const existingState = {
        id: "state-123",
        userId: mockUserId,
        paperId: mockPaperId,
        status: PaperStatus.READ,
        inLibrary: true,
      };

      (db.userPaperState.findUnique as any).mockResolvedValue(existingState);

      const request = new Request("http://localhost/api/papers/123/mark-read", {
        method: "POST",
      });

      const response = await POST(request, { params: { id: mockPaperId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe(PaperStatus.READ);
      expect(data.message).toContain("already");
      expect(db.userPaperState.update).not.toHaveBeenCalled();
    });
  });

  describe("inLibrary Preservation", () => {
    it("should preserve inLibrary flag when updating status", async () => {
      const existingState = {
        id: "state-123",
        userId: mockUserId,
        paperId: mockPaperId,
        status: PaperStatus.NEW,
        inLibrary: true,
      };

      (db.userPaperState.findUnique as any).mockResolvedValue(existingState);
      (db.userPaperState.update as any).mockResolvedValue({
        ...existingState,
        status: PaperStatus.READ,
        inLibrary: true, // Preserved
      });

      const request = new Request("http://localhost/api/papers/123/mark-read", {
        method: "POST",
      });

      const response = await POST(request, { params: { id: mockPaperId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.inLibrary).toBe(true);
      
      // Verify update call does NOT include inLibrary
      const updateCall = (db.userPaperState.update as any).mock.calls[0];
      expect(updateCall[1].data).not.toHaveProperty("inLibrary");
    });
  });

  describe("Creating New State", () => {
    it("should create UserPaperState if it doesn't exist", async () => {
      (db.userPaperState.findUnique as any).mockResolvedValue(null);
      (db.userPaperState.create as any).mockResolvedValue({
        id: "state-123",
        userId: mockUserId,
        paperId: mockPaperId,
        status: PaperStatus.READ,
        inLibrary: true,
      });

      const request = new Request("http://localhost/api/papers/123/mark-read", {
        method: "POST",
      });

      const response = await POST(request, { params: { id: mockPaperId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe(PaperStatus.READ);
      expect(db.userPaperState.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          paperId: mockPaperId,
          status: PaperStatus.READ,
          inLibrary: true,
        },
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      const existingState = {
        id: "state-123",
        userId: mockUserId,
        paperId: mockPaperId,
        status: PaperStatus.NEW,
        inLibrary: true,
      };

      (db.userPaperState.findUnique as any).mockResolvedValue(existingState);
      (db.userPaperState.update as any).mockRejectedValue(
        new Error("Database error")
      );

      const request = new Request("http://localhost/api/papers/123/mark-read", {
        method: "POST",
      });

      const response = await POST(request, { params: { id: mockPaperId } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to mark paper as read");
    });
  });
});
