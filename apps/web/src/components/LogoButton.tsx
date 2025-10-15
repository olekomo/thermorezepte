'use client';
import Link from "next/link";
import { Button } from "./ui/button";
import Logo from "./Logo";

export default function LogoButton() {
  return (<Button asChild size="icon" variant='ghost'>
            <Link href="/" aria-label="Zur App"><Logo/></Link>
          </Button>)
}