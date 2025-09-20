export interface Social {
    github?: string;
    x?: string;
    juejin?: string;
    qq?: string;
    wx?: string;
    cloudmusic?: string;
    zhihu?: string;
    email?: string;
    discord?: string;
}

interface SocialValue {
    href?: string;
    title: string;
    icon: string;
    color: string;
}

const social: Social = {
    github: 'https://github.com/liu7015463',
    x: 'https://x.com/LiuYi_',
    // juejin: 'https://juejin.cn/user/1565318510545901',
    // wx: 'https://img.kuizuo.me/wechat.png',
    // qq: 'https://img.kuizuo.me/qq.png',
    // zhihu: 'https://www.zhihu.com/people/kuizuo',
    // cloudmusic: 'https://music.163.com/#/user/home?id=1333010742',
    email: 'mailto:liuyiinhhu@gmail.com',
    // discord: 'https://discord.gg/M8cVcjDxkz',
};

const socialSet: Record<keyof Social | 'rss', SocialValue> = {
    github: {
        href: social.github,
        title: 'GitHub',
        icon: 'ri:github-line',
        color: '#010409',
    },
    x: {
        href: social.x,
        title: 'X',
        icon: 'ri:twitter-x-line',
        color: '#000',
    },
    email: {
        href: social.email,
        title: '邮箱',
        icon: 'ri:mail-line',
        color: '#D44638',
    },
};

export default socialSet;
