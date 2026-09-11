/**
 * Seeds data/db.json with the 3 problems and, for the hero problem
 * (Parking Lot), one fully seeded attempt with two submissions: a flawed
 * v1 and an improved v2. This is the seeded demo the build plan calls
 * non-negotiable — it's what makes Design Evolution demoable without
 * anyone typing a live example during the actual review.
 *
 * Both evaluations' overallScore are computed with the exact same
 * computeOverallScore() function production code uses — the seed data
 * can't silently drift from the real scoring formula.
 */
import { randomUUID } from "crypto";
import { replaceDb } from "../src/lib/db";
import { DEFAULT_RUBRIC } from "../src/domain/rubric";
import { computeOverallScore, deriveRollup } from "../src/domain/score";
import type {
  Attempt,
  CriterionEvaluation,
  Evaluation,
  Problem,
  Submission,
} from "../src/domain/types";

const PARKING_LOT: Problem = {
  id: "parking-lot",
  title: "Parking Lot",
  isHero: true,
  difficulty: "medium",
  description:
    "Design a parking lot system that tracks available spots across multiple vehicle types, calculates a parking fee on exit, and handles a full lot.",
  requirements: [
    "Park a vehicle in an available spot and unpark it later",
    "Support at least two vehicle/spot types (e.g. compact and large)",
    "Calculate a fee based on how long the vehicle was parked",
    "Reject parking when the lot is full, rather than crashing or silently failing",
  ],
};

const VENDING_MACHINE: Problem = {
  id: "vending-machine",
  title: "Vending Machine",
  isHero: false,
  difficulty: "easy",
  description:
    "Design a vending machine that accepts payment, dispenses a selected item, and handles out-of-stock items and insufficient payment.",
  requirements: [
    "Select an item and dispense it if in stock and paid for",
    "Accept at least two payment methods",
    "Handle an out-of-stock selection without crashing",
    "Return change (or reject the transaction) on incorrect payment",
  ],
};

const ELEVATOR: Problem = {
  id: "elevator",
  title: "Elevator System",
  isHero: false,
  difficulty: "hard",
  description:
    "Design an elevator control system for a building with multiple elevators, handling floor call requests and dispatching the most appropriate elevator.",
  requirements: [
    "Request an elevator from a floor (up or down)",
    "Select a destination floor from inside a car",
    "Dispatch a reasonable elevator among multiple available ones",
    "Handle more than one simultaneous request without contradicting itself",
  ],
};

const V1_CODE = `class ParkingLot {
  private occupied: Map<string, number> = new Map();

  constructor(private totalSpots: number) {}

  parkVehicle(licensePlate: string): void {
    this.occupied.set(licensePlate, Date.now());
  }

  unparkVehicle(licensePlate: string): number {
    const entryTime = this.occupied.get(licensePlate)!;
    const fee = this.calculateFee(entryTime);
    this.processPayment(licensePlate, fee);
    this.generateReceipt(licensePlate, fee);
    this.occupied.delete(licensePlate);
    return fee;
  }

  calculateFee(entryTime: number): number {
    const hours = (Date.now() - entryTime) / (1000 * 60 * 60);
    return Math.ceil(hours) * 5; // flat $5/hour, every vehicle type
  }

  processPayment(licensePlate: string, amount: number): void {
    console.log(\`Charged \${licensePlate} $\${amount}\`);
  }

  generateReceipt(licensePlate: string, amount: number): void {
    console.log(\`Receipt: \${licensePlate} paid $\${amount}\`);
  }
}`;

const V2_CODE = `interface PricingStrategy {
  calculateFee(entryTime: number, exitTime: number): number;
}

class HourlyPricing implements PricingStrategy {
  constructor(private ratePerHour: number) {}
  calculateFee(entryTime: number, exitTime: number): number {
    const hours = (exitTime - entryTime) / (1000 * 60 * 60);
    return Math.ceil(hours) * this.ratePerHour;
  }
}

class SpotManager {
  private spots = new Map<string, boolean>();
  constructor(spotIds: string[]) {
    spotIds.forEach((id) => this.spots.set(id, true));
  }
  findAvailableSpot(): string | null {
    for (const [id, available] of this.spots) if (available) return id;
    return null; // lot is full — handled explicitly, not a crash
  }
  occupy(spotId: string) { this.spots.set(spotId, false); }
  release(spotId: string) { this.spots.set(spotId, true); }
}

class PaymentProcessor {
  charge(licensePlate: string, amount: number): void {
    console.log(\`Charged \${licensePlate} $\${amount}\`);
  }
}

class ReceiptService {
  issue(licensePlate: string, amount: number): void {
    console.log(\`Receipt: \${licensePlate} paid $\${amount}\`);
  }
}

class ParkingLot {
  private occupiedBy = new Map<string, { spotId: string; entryTime: number }>();

  constructor(
    private spotManager: SpotManager,
    private pricingStrategy: PricingStrategy,
    private paymentProcessor: PaymentProcessor,
    private receiptService: ReceiptService
  ) {}

  parkVehicle(licensePlate: string): string | null {
    const spotId = this.spotManager.findAvailableSpot();
    if (!spotId) return null; // lot full
    this.spotManager.occupy(spotId);
    this.occupiedBy.set(licensePlate, { spotId, entryTime: Date.now() });
    return spotId;
  }

  unparkVehicle(licensePlate: string): number {
    const record = this.occupiedBy.get(licensePlate);
    if (!record) throw new Error("Vehicle not found in lot");
    const fee = this.pricingStrategy.calculateFee(record.entryTime, Date.now());
    this.paymentProcessor.charge(licensePlate, fee);
    this.receiptService.issue(licensePlate, fee);
    this.spotManager.release(record.spotId);
    this.occupiedBy.delete(licensePlate);
    return fee;
  }
}

// Trade-off: PricingStrategy was introduced specifically so a new pricing
// rule (peak hours, membership discounts) is a new class, not an edit to
// ParkingLot. Multi-currency support was deliberately left out of scope.`;

function criterion(
  id: string,
  score: number,
  evidence: string,
  feedback: string,
  suggestion: string
): CriterionEvaluation {
  const def = DEFAULT_RUBRIC.criteria.find((c) => c.id === id)!;
  return { criterionId: id, criterionName: def.name, score, evidence, feedback, suggestion };
}

const V1_CRITERIA: CriterionEvaluation[] = [
  criterion(
    "requirement-coverage",
    7,
    "parkVehicle() and unparkVehicle() handle the core flow and calculateFee() computes a fee, but there's no handling for a full lot or multiple vehicle types.",
    "Core parking/unparking and fee calculation are present; the full-lot and multi-vehicle-type requirements aren't addressed.",
    "Add an explicit check and response for when no spots are available."
  ),
  criterion(
    "domain-modeling",
    7,
    "ParkingLot is the only class; the ideas of a spot, a vehicle, and a payment are implied by method names but never given their own type.",
    "The single class captures the workflow but doesn't model the underlying concepts separately.",
    "Introduce Spot and Vehicle as explicit types."
  ),
  criterion(
    "encapsulation",
    5,
    "processPayment() and generateReceipt() are both methods directly on ParkingLot, alongside the parking logic itself.",
    "Payment and receipt behavior are handled inline rather than owned by a collaborator whose job they actually are.",
    "Extract payment and receipt generation into their own classes."
  ),
  criterion(
    "extensibility",
    4,
    "calculateFee() is a method on ParkingLot itself with a hardcoded flat rate, so a new pricing rule means editing ParkingLot directly.",
    "Pricing changes require modifying ParkingLot — there's no seam for a new pricing rule.",
    "Extract pricing behind a PricingStrategy interface so a new rule is a new class, not an edit to ParkingLot."
  ),
  criterion(
    "solid",
    6,
    "ParkingLot has five responsibilities: parking, unparking, fee calculation, payment processing, and receipt generation.",
    "This concentrates responsibilities that could each change for independent reasons — a Single Responsibility concern.",
    "Split payment processing and receipt generation into their own collaborators."
  ),
  criterion(
    "tradeoffs",
    5,
    "The submission has no accompanying explanation of why it's structured this way.",
    "No trade-offs or rationale are given for the design's current shape.",
    "Add a short note on what was prioritized and what was deliberately left out."
  ),
];

const V2_CRITERIA: CriterionEvaluation[] = [
  criterion(
    "requirement-coverage",
    9,
    "SpotManager.findAvailableSpot() explicitly returns null when the lot is full, which parkVehicle() checks before proceeding.",
    "Core flow plus the full-lot edge case are now handled explicitly rather than assumed away.",
    "Consider also handling a vehicle attempting to unpark twice."
  ),
  criterion(
    "domain-modeling",
    8,
    "SpotManager, PricingStrategy, PaymentProcessor, and ReceiptService are now separate types alongside ParkingLot.",
    "The concepts underlying the workflow now have their own representation instead of being implicit in method names.",
    "A Vehicle type (rather than a raw license plate string) would complete the picture."
  ),
  criterion(
    "encapsulation",
    8,
    "ParkingLot now delegates to spotManager, pricingStrategy, and paymentProcessor rather than doing the work itself.",
    "Responsibilities are owned by the collaborator whose job they actually are.",
    "No changes needed for this MVP scope."
  ),
  criterion(
    "extensibility",
    8,
    "PricingStrategy is an interface with HourlyPricing as one implementation, injected into ParkingLot's constructor.",
    "A new pricing rule is now a new class implementing PricingStrategy, not an edit to ParkingLot.",
    "The same seam could be extended to PaymentProcessor for multiple payment methods."
  ),
  criterion(
    "solid",
    8,
    "Payment processing and receipt generation were extracted into PaymentProcessor and ReceiptService, leaving ParkingLot to coordinate spot allocation.",
    "ParkingLot's remaining responsibility is much closer to a single reason to change.",
    "No changes needed for this MVP scope."
  ),
  criterion(
    "tradeoffs",
    7,
    "A comment on the submission states PricingStrategy was introduced specifically so pricing changes don't touch ParkingLot, and that multi-currency was left out of scope.",
    "One clear trade-off is named, with an explicit statement of what was deliberately deferred.",
    "Naming a second trade-off (e.g. why SpotManager doesn't reserve spot types) would strengthen this further."
  ),
];

function buildEvaluation(submissionId: string, criteria: CriterionEvaluation[]): Evaluation {
  const overallScore = computeOverallScore(criteria, DEFAULT_RUBRIC);
  const { strengths, weaknesses, suggestions } = deriveRollup(criteria);
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    submissionId,
    rubricId: DEFAULT_RUBRIC.id,
    attempts: 0,
    status: "completed",
    overallScore,
    criteria,
    strengths,
    weaknesses,
    suggestions,
    createdAt: now,
    updatedAt: now,
    failureReason: null,
  };
}

async function seed() {
  const heroAttempt: Attempt = {
    id: randomUUID(),
    problemId: PARKING_LOT.id,
    status: "completed",
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  };

  const submissionV1: Submission = {
    id: randomUUID(),
    attemptId: heroAttempt.id,
    version: 1,
    content: { type: "code", content: V1_CODE },
    submittedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  };
  const submissionV2: Submission = {
    id: randomUUID(),
    attemptId: heroAttempt.id,
    version: 2,
    content: { type: "code", content: V2_CODE },
    submittedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  };

  const evaluationV1 = buildEvaluation(submissionV1.id, V1_CRITERIA);
  const evaluationV2 = buildEvaluation(submissionV2.id, V2_CRITERIA);

  await replaceDb({
    problems: [PARKING_LOT, VENDING_MACHINE, ELEVATOR],
    rubrics: [DEFAULT_RUBRIC],
    attempts: [heroAttempt],
    submissions: [submissionV1, submissionV2],
    evaluations: [evaluationV1, evaluationV2],
  });

  console.log("Seeded data/db.json:");
  console.log(`  3 problems (hero: ${PARKING_LOT.title})`);
  console.log(`  1 seeded attempt with 2 submissions`);
  console.log(`  Attempt 1 overall: ${evaluationV1.overallScore} -> Attempt 2 overall: ${evaluationV2.overallScore}`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
