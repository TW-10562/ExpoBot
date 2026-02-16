import { getMenusSer, getRoutersSer } from '@/service/menu';
import { getUserRoleSer } from '@/service/user';
import { formatHumpLineTransfer } from '@/utils';
import { bindCheck } from '@/utils/bind';
import { saveMenuMes } from '@/utils/redis';
import { MenuParamsType, menusSqlType, menusType, RouteType, userType } from '@/types';
import { Context } from 'koa';
import { Op } from 'sequelize';
import RoleMenu from '@/mysql/model/role_menu.model';
import UserRole from '@/mysql/model/user_role.model';
import { addJudg, putJudg } from '@/routes/role';
import Menu from '@/mysql/model/menu.model';
import { queryConditionsData } from '@/service';
import { add, del, getDetail, put } from '@/utils/mapper';
import { updateUserInfo } from '@/utils/redis';

const markUsersForMenuRefresh = async (menuIds: number[]) => {
  const normalizedMenuIds = Array.from(
    new Set(menuIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)),
  );
  if (normalizedMenuIds.length === 0) {
    return;
  }

  const roleRows = (await queryConditionsData(RoleMenu, {
    menu_id: { [Op.in]: normalizedMenuIds },
  })) as Array<{ role_id: number }>;
  const roleIds = Array.from(
    new Set(roleRows.map((row) => Number(row.role_id)).filter((id) => Number.isInteger(id) && id > 0)),
  );
  if (roleIds.length === 0) {
    return;
  }

  const userRows = (await queryConditionsData(UserRole, {
    role_id: { [Op.in]: roleIds },
  })) as Array<{ user_id: number }>;
  const userIds = Array.from(
    new Set(userRows.map((row) => Number(row.user_id)).filter((id) => Number.isInteger(id) && id > 0)),
  );
  if (userIds.length > 0) {
    await updateUserInfo('update_userInfo', userIds);
  }
};

export const conversionCtl = async (ctx: Context, next: () => Promise<void>) => {
  try {
    const firstRes = await getRoutersSer();
    const newRes = formatHumpLineTransfer(firstRes, 'hump');
    ctx.state.menus = newRes;
  } catch (error) {
    console.error(error);
    return ctx.app.emit('error', {
      code: '500',
      message: 'メニュー情報の取得に失敗しました',
    }, ctx);
  }
  await next();
};

export const getRouterCtl = async (ctx: Context, next: () => Promise<void>) => {
  try {
    const { menus } = ctx.state;
    const routers = [] as RouteType[];
    menus.sort((a: { orderNum: number }, b: { orderNum: number }) => a.orderNum - b.orderNum);

    const createRoute = (route: RouteType, parentId: number) => {
      menus.forEach((menu: menusType) => {
        if (menu.parentId === parentId) {
          const routeChild = {
            name: menu.path,
            path: menu.path,
            query: menu.query,
            alwaysShow: menu.menuType === 'M',
            element: menu.component,
            hidden: menu.visible !== '0',
            children: [],
            perms: menu.perms,
            meta: {
              title: menu.menuName,
              link: menu.isFrame ? null : menu.path,
              noCache: !menu.isCache,
              icon: menu.icon,
            },
          };
          route.children.push(routeChild);

          createRoute(routeChild, menu.menuId);
        }
      });

      if (route.children.length < 1) {
        // eslint-disable-next-line no-param-reassign
        delete route.children;
      }
    };

    menus.forEach((menu: menusType) => {
      if (menu.parentId === 0) {
        const route = {} as RouteType;
        Object.assign(route, {
          name: menu.path,
          path: `/${menu.path}`,
          alwaysShow: menu.menuType === 'M',
          element: menu.component,
          hidden: menu.visible !== '0',
          children: [],
          query: menu.query,
          perms: menu.perms,
          meta: {
            title: menu.menuName,
            link: menu.isFrame ? null : menu.path,
            noCache: !menu.isCache,
            icon: menu.icon,
          },
        });
        createRoute(route, menu.menuId);

        if (route.children && route.children.length < 1) {
          delete route.children;
        }
        routers.push(route);
      }
    });

    saveMenuMes(routers);
    ctx.state.formatData = routers;
  } catch (error) {
    console.error(error);
    return ctx.app.emit('error', {
      code: '500',
      message: 'メニュールートの取得に失敗しました',
    }, ctx);
  }
  await next();
};

export const getMenusCtl = async (ctx: Context, next: () => Promise<void>) => {
  try {
    const params = ctx.query as unknown as MenuParamsType;
    const whereObj = {};
    const { status, menuName } = params;
    if (status) Object.assign(whereObj, { status });
    if (menuName) Object.assign(whereObj, { menu_name: { [Op.like]: `${menuName}%` } });

    const { userId } = ctx.state.user as userType;
    if (userId !== 1) {
      const roleIds = (await getUserRoleSer(userId)) as unknown as { role_id: number }[];
      const ids = roleIds.map((item) => item.role_id);

      const menuRoles = await queryConditionsData(RoleMenu, { role_id: { [Op.in]: ids } });
      const menuIds = menuRoles.map((item) => item.menu_id);
      const filterMenuIds = Array.from(new Set(menuIds));
      Object.assign(whereObj, { menu_id: { [Op.in]: filterMenuIds } });
    }

    const res = await getMenusSer(whereObj);
    ctx.state.formatData = res;
    await next();
  } catch (error) {
    console.error(error);
    return ctx.app.emit('error', {
      code: '500',
      message: 'リストの取得に失敗しました',
    }, ctx);
  }
};

export const addEditSchema = (judge: string) => async (ctx: Context, next: () => Promise<void>) => {
  try {
    const list = ctx.request.body as menusType;
    if (judge === 'add') {
      await addJudg.validateAsync(list);
    } else {
      await putJudg.validateAsync(list);
    }
  } catch (error) {
    console.error(error);
    return ctx.app.emit('error', {
      code: '400',
      message: 'アップロードパラメータを確認してください',
    }, ctx);
  }
  await next();
};

export const addMenuCtl = async (ctx: Context, next: () => Promise<void>) => {
  try {
    const list = ctx.request.body as menusType;
    const menu = formatHumpLineTransfer(list, 'line');

    await add(Menu, menu);
  } catch (error) {
    console.error(error);
    return ctx.app.emit('error', {
      code: '500',
      message: '追加に失敗しました',
    }, ctx);
  }
  await next();
};

export const delMenuCtl = async (ctx: Context, next: () => Promise<void>) => {
  try {
    const ids = ctx.state.ids as string[];
    const menuIds = ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0);

    if ((await bindCheck(Menu, { parent_id: ids })).length > 0) {
      ctx.body = {
        code: 500,
        message: '存在子菜单,不允许删除',
      };
    } else if ((await bindCheck(RoleMenu, { menu_id: ids })).length > 0) {
      ctx.body = {
        code: 500,
        message: 'メニューが割り当てられ、「削除」は禁止されています',
      };
    } else {
      await del(Menu, { menu_id: ids });
      await markUsersForMenuRefresh(menuIds);
      await next();
    }
  } catch (error) {
    console.error(error);
    return ctx.app.emit('error', {
      code: '500',
      message: '削除に失敗しました',
    }, ctx);
  }
};

export const getDetailCtl = async (ctx: Context, next: () => Promise<void>) => {
  try {
    const res = await getDetail(Menu, { menu_id: ctx.state.ids });
    ctx.state.formatData = res;
  } catch (error) {
    console.error(error);
    return ctx.app.emit('error', {
      code: '500',
      message: 'サーバー内部エラー',
    }, ctx);
  }
  await next();
};

export const putCtl = async (ctx: Context, next: () => Promise<void>) => {
  try {
    const { userName } = ctx.state.user as userType;
    const res = ctx.request.body as menusType;
    const menu = formatHumpLineTransfer(res, 'line') as unknown as menusSqlType;
    const { menu_id, ...data } = menu;
    await put(Menu, { menu_id }, { ...data, update_by: userName });
    await markUsersForMenuRefresh([Number(menu_id)]);
    await next();
  } catch (error) {
    return ctx.app.emit('error', {
      code: '400',
      message: 'アップロードパラメータを確認してください',
    }, ctx);
  }
};
