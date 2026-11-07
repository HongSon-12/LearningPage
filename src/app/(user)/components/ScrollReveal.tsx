"use client";
import {useRef} from "react";
import {motion,useScroll,useTransform,useSpring,type HTMLMotionProps} from "framer-motion";
type Props=HTMLMotionProps<"div">;
export function ScrollReveal({children,className,...props}:Props){
 const ref=useRef<HTMLDivElement>(null);
 const {scrollYProgress}=useScroll({target:ref,offset:["start end","end start"]});
 const position=useTransform(scrollYProgress,[0,0.5,1],[28,0,-28]);
 const y=useSpring(position,{stiffness:150,damping:28,mass:0.4});
 return <motion.div {...props} ref={ref} data-slot="scroll-reveal" className={`relative ${className||""}`} style={{y}}
   initial="hidden" animate="hidden" whileInView="visible" viewport={{once:false,amount:0.12,margin:"-80px 0px -48px 0px"}}
   variants={{hidden:{opacity:0},visible:{opacity:1,transition:{duration:0.55,ease:"easeOut"}}}}>{children}</motion.div>;
}
