import React from "react";
import RelatedCourses from "../components/RelatedCourses";
import LandingSections from "../components/LandingSections";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <div className="w-full">
      <LandingSections />
      <RelatedCourses type="COMMUNITY_FIRST_AID" />
    </div>
  );
}
