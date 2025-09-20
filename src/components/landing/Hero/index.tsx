import type { Variants } from 'framer-motion';

import SocialLinks from '@site/src/components/SocialLinks';
import { motion } from 'framer-motion';

import { MovingButton } from '../../magicui/moving-border';
import HeroSvg from './img/ray.svg';
import styles from './styles.module.css';

const variants: Variants = {
    visible: (i) => ({
        opacity: 1,
        y: 0,
        transition: {
            type: 'spring',
            damping: 25,
            stiffness: 100,
            duration: 0.3,
            delay: i * 0.3,
        },
    }),
    hidden: { opacity: 0, y: 30 },
};

function Circle() {
    return <div className={styles.circle} />;
}

function Name() {
    return (
        <motion.div
            className={styles.hero_text}
            custom={1}
            initial="hidden"
            animate="visible"
            variants={variants}
            onMouseMove={(e) => {
                e.currentTarget.style.setProperty('--x', `${e.clientX}px`);
                e.currentTarget.style.setProperty('--y', `${e.clientY}px`);
            }}
        >
            你好! 我是
            <span
                className={styles.name}
                onMouseMove={(e) => {
                    const bounding = e.currentTarget.getBoundingClientRect();
                    e.currentTarget.style.setProperty('--mouse-x', `${bounding.x}px`);
                    e.currentTarget.style.setProperty('--mouse-y', `${bounding.y}px`);
                }}
            >
                刘毅
            </span>
            <span className="ml-1">👋</span>
        </motion.div>
    );
}

export default function Hero() {
    return (
        <motion.div className={styles.hero}>
            <div className={styles.intro}>
                <Name />
                <motion.p custom={2} initial="hidden" animate="visible" variants={variants} className="max-lg:px-4">
                    在这里我会分享各类技术栈所遇到问题与解决方案，带你了解最新的技术栈以及实际开发中如何应用，并希望我的开发经历对你有所启发。
                </motion.p>
                <motion.div custom={3} initial="hidden" animate="visible" variants={variants}>
                    <SocialLinks />
                </motion.div>

                <motion.div
                    className={styles.buttonContainer}
                    custom={4}
                    initial="hidden"
                    animate="visible"
                    variants={variants}
                >
                    <MovingButton borderRadius="1rem" className={styles.introButton}>
                        <a href="/docs/intro" className={styles.buttonLink}>
                            查看文档
                        </a>
                    </MovingButton>
                </motion.div>
            </div>
            <motion.div className={styles.background}>
                <HeroSvg />
                <Circle />
            </motion.div>
        </motion.div>
    );
}
