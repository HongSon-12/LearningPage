"use client";
import RouteError from "@/components/navigation/route-error";
export default function ErrorPage(props:{error:Error&{digest?:string};retry:()=>void}){
 return <RouteError {...props} supportHref="/hocsocapcuu" supportLabel="Về trang chủ"/>;
}
