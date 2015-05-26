CREATE TABLE `subscription` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `topic` text NOT NULL,
    `type` varchar(191) NOT NULL,
    `huburi` text NOT NULL,
    `secret` text,
    `state` enum("subscribe", "active", "unsubscribe", "inactive", "nohub") NOT NULL,
    `last_ping` datetime,                                               # Last time we heard from the hub
    `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,              # Date this record was created
    `modified` datetime,                                                # Date this record was modified (ex: expires, subbed, unsubbed, etc.)
    `sub_start` datetime NOT NULL,                                      # Date the (re)subscribtion started
    `sub_end` datetime NOT NULL,                                        # Date the subscribtion is set to expire
    PRIMARY KEY (`id`),
    UNIQUE(topic(100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `event` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `subscription_id` int(11) NOT NULL,
    `title` text NOT NULL,
    `content` text,
    `published` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated` datetime DEFAULT CURRENT_TIMESTAMP,
    `foreign_url` text NOT NULL,
    `object_type` varchar(191) NOT NULL,
    `object_verb` varchar(191) NOT NULL,
    PRIMARY KEY (`id`),
    FOREIGN KEY (subscription_id)
        REFERENCES subscription(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

