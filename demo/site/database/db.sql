create database if not exists my_test_db;
use my_test_db;

drop table t_users_in_group;
drop table t_users;
drop table t_groups;

create table if not exists t_users (
	`__id__` int unsigned not null auto_increment,
	`code` char(16) not null,
	`name` varchar(16) not null,
	`sex` tinyint default 0,
	`email` char(64),
	`address` varchar(64),
	`enabled` tinyint default 0,
	`create_time` timestamp DEFAULT current_timestamp,
	unique key `t_users_uidx_1` (`code`),
	primary key (`__id__`)
) engine=InnoDB default charset=utf8;

create table if not exists t_groups (
	`__id__` int unsigned not null auto_increment,
	`name` varchar(16) not null,
	`desc` varchar(32),
	`enabled` tinyint default 0,
	`create_time` timestamp DEFAULT current_timestamp,
	unique key `t_groups_uidx_1` (`name`),
	primary key (`__id__`)
) engine=InnoDB default charset=utf8;

create table if not exists t_users_in_group (
	`__id__` int unsigned not null auto_increment,
	`user_id` int unsigned not null,
	`group_id` int unsigned not null,
	unique key `t_users_in_group_uidx_1` (`group_id`, `user_id`),
	constraint `t_users_in_group_ibfk_1` foreign key (`user_id`) references t_users(`__id__`) on delete cascade,
	constraint `t_users_in_group_ibfk_2` foreign key (`group_id`) references t_groups(`__id__`) on delete cascade,
	primary key (`__id__`)
) engine=InnoDB default charset=utf8;