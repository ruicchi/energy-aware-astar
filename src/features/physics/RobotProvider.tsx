import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { type Heading } from "../../shared/types";

interface RobotContextType {
  robotHeading: Heading;
  setRobotHeading: (heading: Heading) => void;
  isWalking: boolean;
  setIsWalking: (walking: boolean) => void;
  currentPath: string[] | null;
  setCurrentPath: (path: string[] | null) => void;
  walkFailure: { row: number; col: number; reason: string } | null;
  setWalkFailure: (failure: { row: number; col: number; reason: string } | null) => void;
}

const RobotContext = createContext<RobotContextType | null>(null);

export const useRobotContext = () => {
  const ctx = useContext(RobotContext);
  if (!ctx) throw new Error("useRobotContext must be used within RobotProvider");
  return ctx;
};

export const RobotProvider = ({ children }: { children: ReactNode }) => {
  const [robotHeading, setRobotHeading] = useState<Heading>("RIGHT");
  const [isWalking, setIsWalking] = useState(false);
  const [currentPath, setCurrentPath] = useState<string[] | null>(null);
  const [walkFailure, setWalkFailure] = useState<{
    row: number;
    col: number;
    reason: string;
  } | null>(null);

  return (
    <RobotContext.Provider
      value={{
        robotHeading,
        setRobotHeading,
        isWalking,
        setIsWalking,
        currentPath,
        setCurrentPath,
        walkFailure,
        setWalkFailure,
      }}
    >
      {children}
    </RobotContext.Provider>
  );
};
