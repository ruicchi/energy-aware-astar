import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

interface LearnMoreModalProps {
  open: boolean;
  onClose: () => void;
}

interface FormulaBoxProps {
  children: string;
}

function FormulaBox({ children }: FormulaBoxProps) {
  return (
    <Box
      sx={{
        my: 1.5,
        px: 2,
        py: 1,
        bgcolor: "grey.100",
        borderLeft: "3px solid",
        borderColor: "primary.main",
        borderRadius: 1,
        fontFamily: "monospace",
        fontSize: "0.82rem",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {children}
    </Box>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, fontSize: "1rem" }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

/**
 * Full-screen dialog that explains the Energy-Aware A* algorithm,
 * its heuristics, cost model, and physics layer.
 */
export function LearnMoreModal({ open, onClose }: LearnMoreModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      scroll="paper"
      maxWidth="md"
      fullWidth
      aria-labelledby="learn-more-title"
    >
      <DialogTitle
        id="learn-more-title"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pr: 1,
        }}
      >
        <Typography variant="h5" component="span" sx={{ fontWeight: 700 }}>
          How it works
        </Typography>
        <IconButton aria-label="close" onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ px: 4, py: 3 }}>
        {/* ── Overview ── */}
        <Section title="Overview">
          <Typography variant="body2" gutterBottom>
            Standard A* finds the geometrically shortest path between two nodes. Energy-Aware A*
            replaces that purely distance-based objective with an <strong>energy cost model</strong>{" "}
            that accounts for the real-world power consumption of an autonomous wheeled robot
            traversing various terrains.
          </Typography>
          <Typography variant="body2">
            The result is a path that may be slightly longer in distance but substantially cheaper
            in energy (avoiding steep climbs, rough surfaces, and unnecessary direction changes.)
          </Typography>
        </Section>

        {/* ── The A* Framework ── */}
        <Section title="The A* Framework">
          <Typography variant="body2" gutterBottom>
            A* maintains an open set (priority queue) and a closed set. Each candidate node{" "}
            <em>n</em> is scored by:
          </Typography>
          <FormulaBox>{"f(n) = g(n) + h(n)"}</FormulaBox>
          <Typography variant="body2">
            where <strong>g(n)</strong> is the accumulated cost from the start to <em>n</em>, and{" "}
            <strong>h(n)</strong> is an admissible heuristic estimating the remaining cost to the
            goal. The node with the lowest <em>f</em> value is expanded first.
          </Typography>
        </Section>

        {/* ── Edge Cost g(n) ── */}
        <Section title="Edge Cost, g(n)">
          <Typography variant="body2" gutterBottom>
            Moving from one cell to an adjacent cell accumulates an energy cost built from five
            additive components:
          </Typography>
          <FormulaBox>
            {"g_step = baseMovement + climbingCost + turnCost + terrainPenalty + stabilityPenalty"}
          </FormulaBox>

          <Typography variant="body2" sx={{ mt: 1.5, mb: 0.5, fontWeight: 600 }}>
            Base movement
          </Typography>
          <Typography variant="body2" gutterBottom>
            1.0 for cardinal moves, √2 ≈ 1.414 for diagonal moves.
          </Typography>

          <Typography variant="body2" sx={{ mt: 1.5, mb: 0.5, fontWeight: 600 }}>
            Climbing cost
          </Typography>
          <Typography variant="body2" gutterBottom>
            Uphill moves multiply the step distance by a <em>climbing factor</em>. Slopes exceeding
            a configurable excessive-slope threshold incur an even larger penalty multiplier to
            model real wheel-slip and motor strain.
          </Typography>
          <FormulaBox>{"climbingCost = stepDistance × (gradientMultiplier − 1.0)"}</FormulaBox>

          <Typography variant="body2" sx={{ mt: 1.5, mb: 0.5, fontWeight: 600 }}>
            Turn cost
          </Typography>
          <Typography variant="body2" gutterBottom>
            Changing heading costs energy proportional to the angular change. The difference between
            the outgoing and incoming headings (quantised to 8 directions) is converted to radians
            and multiplied by a configurable turn-penalty constant.
          </Typography>
          <FormulaBox>{"turnCost = |Δθ| × turnPenalty"}</FormulaBox>

          <Typography variant="body2" sx={{ mt: 1.5, mb: 0.5, fontWeight: 600 }}>
            Terrain penalty
          </Typography>
          <Typography variant="body2" gutterBottom>
            Each cell carries a terrain factor (e.g. dirt, water, or custom surface). The penalty is
            averaged between the leaving cell and the entering cell, weighted by step distance.
          </Typography>
          <FormulaBox>
            {"terrainPenalty = stepDistance × 0.5 × (factor_from + factor_to)"}
          </FormulaBox>

          <Typography variant="body2" sx={{ mt: 1.5, mb: 0.5, fontWeight: 600 }}>
            Stability penalty
          </Typography>
          <Typography variant="body2" gutterBottom>
            The robot's centre-of-mass roll and pitch are computed from the local elevation
            gradient. A combined risk factor is multiplied by the movement sub-total to penalise
            cells where the robot is close to its tipping threshold.
          </Typography>
          <FormulaBox>
            {
              "riskFactor = √((roll × kRoll)² + (pitch × kPitch)²)\nstabilityPenalty = movementSubtotal × riskWeight × riskFactor"
            }
          </FormulaBox>
        </Section>

        {/* ── Heuristic h(n) ── */}
        <Section title="Energy Heuristic, h(n)">
          <Typography variant="body2" gutterBottom>
            The admissible energy heuristic combines three lower-bound estimates:
          </Typography>
          <FormulaBox>{"h(n) = h_translation + h_rotation + h_elevation"}</FormulaBox>

          <Typography variant="body2" sx={{ mt: 1.5, mb: 0.5, fontWeight: 600 }}>
            Translation (h_translation)
          </Typography>
          <Typography variant="body2" gutterBottom>
            Euclidean distance to the goal divided by the robot's maximum velocity divisor — a lower
            bound on translational energy over flat, obstacle-free ground.
          </Typography>

          <Typography variant="body2" sx={{ mt: 1.5, mb: 0.5, fontWeight: 600 }}>
            Rotation (h_rotation)
          </Typography>
          <Typography variant="body2" gutterBottom>
            The minimum angle the robot must turn to face the goal, multiplied by the same turn
            penalty used in the edge cost. This ensures the heuristic never overestimates turning
            effort.
          </Typography>

          <Typography variant="body2" sx={{ mt: 1.5, mb: 0.5, fontWeight: 600 }}>
            Elevation (h_elevation)
          </Typography>
          <Typography variant="body2" gutterBottom>
            If the goal is higher than the current node, the elevation difference multiplied by the
            climbing factor provides a lower bound on the climbing energy required. Downhill legs
            are ignored (conservative).
          </Typography>
        </Section>

        {/* ── Alternative Heuristics ── */}
        <Section title="Alternative Heuristics">
          <Typography variant="body2" gutterBottom>
            The simulator also supports several classical distance-only heuristics for comparison:
          </Typography>
          <Box component="ul" sx={{ pl: 2.5, mt: 0.5 }}>
            {[
              [
                "Manhattan",
                "Sum of absolute row and column differences. Admissible for 4-way grids.",
              ],
              ["Euclidean", "Straight-line distance. Always admissible."],
              ["Chebyshev", "Maximum of row/column differences. Admissible for 8-way grids."],
              [
                "Octile",
                "Optimally tight for 8-way grids: combines diagonal and straight moves (dx + dy + (√2 − 2) × min(dx, dy)).",
              ],
              [
                "3D variants",
                "Each heuristic has a 3D counterpart that also accounts for elevation in the distance estimate.",
              ],
            ].map(([name, desc]) => (
              <Box component="li" key={name} sx={{ mb: 0.75 }}>
                <Typography variant="body2">
                  <strong>{name}</strong> — {desc}
                </Typography>
              </Box>
            ))}
          </Box>
        </Section>

        {/* ── Terrain & Elevation ── */}
        <Section title="Terrain & Elevation Model">
          <Typography variant="body2" gutterBottom>
            Elevation values are stored per cell and scaled by a global <em>elevationScale</em>{" "}
            constant. The local gradient at each cell is computed using a weighted Sobel-like kernel
            over its 8 neighbours:
          </Typography>
          <FormulaBox>
            {
              "zx = (zR + inv√2·(zTR + zBR) − (zL + inv√2·(zTL + zBL))) / weight\nzy = (zB + inv√2·(zBL + zBR) − (zT + inv√2·(zTL + zTR))) / weight"
            }
          </FormulaBox>
          <Typography variant="body2" gutterBottom>
            A cell is marked <strong>unstable</strong> if its gradient magnitude exceeds the
            configured maximum traversable slope (converted from degrees to a tangent ratio).
            Unstable cells are treated as impassable, matching real rover constraints.
          </Typography>
          <Typography variant="body2">
            The robot's <strong>pitch</strong> (nose up/down) and <strong>roll</strong> (side tilt)
            are derived from the gradient projected onto the current heading direction and its
            perpendicular, and are used to compute the stability penalty and tip-over check.
          </Typography>
        </Section>

        {/* ── Why It Matters ── */}
        <Section title="Why Energy-Aware Planning Matters">
          <Typography variant="body2" gutterBottom>
            Battery-powered robots operating in the field — planetary rovers, agricultural robots,
            warehouse AMRs — have hard energy budgets. A path that is 10% longer in distance but
            avoids a steep climb or a stretch of soft soil can extend mission range significantly.
          </Typography>
          <Typography variant="body2">
            By baking the physics of locomotion directly into the heuristic and edge cost,
            Energy-Aware A* produces paths that are provably optimal with respect to the energy
            model while retaining the computational efficiency of A*.
          </Typography>
        </Section>
      </DialogContent>
    </Dialog>
  );
}
