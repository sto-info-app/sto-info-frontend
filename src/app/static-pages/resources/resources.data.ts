export interface ResourceLink {
  label: string;
  url: string;
  description?: string;
}

export interface ResourceSection {
  heading: string;
  links: ResourceLink[];
}

export const RESOURCE_LINKS: ResourceSection[] = [
  {
    heading: 'Play Star Trek Online',
    links: [
      {
        label: 'Steam',
        url: 'https://store.steampowered.com/app/9900/Star_Trek_Online/',
        description: 'Download and play STO via Steam',
      },
      {
        label: 'Arc Games',
        url: 'https://www.playstartrekonline.com/en/download',
        description: 'Download and play STO via the Arc Games client',
      },
      {
        label: 'Epic Games Store',
        url: 'https://store.epicgames.com/en-US/p/star-trek-online',
        description: 'Download and play STO via Epic Games',
      },
      {
        label: 'PlayStation Store',
        url: 'https://store.playstation.com/en-us/product/UP1980-CUSA05752_00-2016STARTREK0000',
        description: 'Download STO on PlayStation',
      },
      {
        label: 'Xbox / Microsoft Store',
        url: 'https://www.xbox.com/en-US/games/store/star-trek-online/C3LF9PCRP9RP/0001',
        description: 'Download STO on Xbox',
      },
    ],
  },
  {
    heading: 'Official Star Trek Online Resources',
    links: [
      {
        label: 'Star Trek Online Official Website',
        url: 'https://www.playstartrekonline.com/',
        description: 'The official STO website',
      },
      {
        label: 'Official Patch Notes',
        url: 'https://www.playstartrekonline.com/en/news#patch-notes',
        description: 'Latest game patch notes and updates',
      },
      {
        label: 'Cryptic Studios Twitch Channel',
        url: 'https://www.twitch.tv/crypticstudios',
        description:
          'Watch Cryptic Studios on Twitch for updates and announcements',
      },
      {
        label: 'Star Trek Online YouTube Channel',
        url: 'https://www.youtube.com/@StarTrekOnlineGame',
        description:
          'Official STO YouTube channel with trailers and developer content',
      },
    ],
  },
  {
    heading: 'Community & Discord Servers',
    links: [
      {
        label: 'Star Trek Online Official Discord',
        url: 'https://discord.gg/startrekonline',
        description: 'The official STO Discord server',
      },
      {
        label: 'STO Builds Discord',
        url: 'https://discord.gg/stobuilds',
        description:
          'Community server dedicated to ship builds and optimisation',
      },
      {
        label: 'STOInfo Discord',
        url: 'https://discord.gg/GMZsbhNHFh',
        description: 'The STO Info community Discord server',
      },
    ],
  },
  {
    heading: 'Wiki & Reference',
    links: [
      {
        label: 'STO Wiki',
        url: 'https://stowiki.net/',
        description: 'The community-maintained Star Trek Online knowledge base',
      },
      {
        label: 'Memory Alpha',
        url: 'https://memory-alpha.fandom.com/',
        description: 'The comprehensive Star Trek canon wiki',
      },
      {
        label: 'Memory Beta',
        url: 'https://memory-beta.fandom.com/',
        description: 'Non-canon Star Trek expanded universe wiki',
      },
    ],
  },
  {
    heading: 'Build Tools & DPS Resources',
    links: [
      {
        label: 'STO DPS League',
        url: 'https://sto-league.com/',
        description: 'DPS league charts and combat log analysis tools',
      },
    ],
  },
  {
    heading: 'Community Subreddits',
    links: [
      {
        label: 'r/sto',
        url: 'https://www.reddit.com/r/sto/',
        description: 'The main Star Trek Online subreddit',
      },
      {
        label: 'r/stobuilds',
        url: 'https://www.reddit.com/r/stobuilds/',
        description: 'Ship builds, optimisation tips and discussions',
      },
      {
        label: 'STOInfo Subreddit',
        url: 'https://www.reddit.com/r/STOinfo/',
        description: 'The STO Info community subreddit',
      },
    ],
  },
];
